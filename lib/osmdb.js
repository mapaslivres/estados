var fs = require('fs');
var _ = require('underscore');
var async = require('async');
var Overpass = require('./overpass')();
var stringify = require('csv-stringify');


var db  = {
  nodes: {},
  ways: {},
  relations: {}
}

/**
* Contructor
**/

function OSMDb(options) {
  if (!(this instanceof OSMDb)) return new OSMDb(options);

  var self = this;

  var defaults = {
  };

  self.options = _.extend(defaults, options);
}

/**
* Helpers for handling OSM Objects
**/

function nodeGeometry(id) {
  var node = db.nodes[id];
  return [node.lon, node.lat];
}

function getWayGeometry(id) {
  var way = db.ways[id];
  var geometry = [];
  _.each(way.nodes, function(id){
    geometry.push(nodeGeometry(id));
  })
  return geometry;
}

function joinLines(line1, line2) {
  var result = []; // return empty array if lines aren't joinable
  var line1Start = line1[0];
  var line1End = line1[line1.length-1];
  var line2Start = line2[0];
  var line2End = line2[line2.length-1];

  if (line1End[0] == line2Start[0] && line1End[1] == line2Start[1]) {
    // remove duplicated point
    line2.shift();

    return line1.concat(line2);
  } else if (line1End[0] == line2End[0] && line1End[1] == line2End[1]) {
    // invert line2
    line2 = line2.reverse();

    // remove duplicated point
    line2.shift();

    result = line1.concat(line2);
  } else if (line1Start[0] == line2Start[0] && line1Start[1] == line2Start[1]) {

    // remove duplicated point
    line2.shift();

    // invert line2
    line2 = line2.reverse();

    result = line2.concat(line1);
  } else if (line1Start[0] == line2End[0] && line1Start[1] == line2End[1]) {
    // remove duplicated point
    line2.pop();

    result = line2.concat(line1);
  }

  return result;
}

function checkBoundaryRelation(id, osm_data, doneCheckRelation) {

  var relation = osm_data.relations[id];
  var members = relation.members;
  var admin_centre = [];
  var label = [];
  var rings = [];
  var previous_member;
  var errors = []; // [ relation_id, error_type, member_id (optional)]

  // sweep through relation
  _.each(members, function(member, i, list){

    var role = member.role;

    if (role) {
      if (role == 'admin_centre') { admin_centre.push(member); }
      if (role == 'label') { label.push(member); }
    } else {
      console.log('Member missing role.', {relation: id, member: i})
    }
  });

  if (admin_centre.length > 1) {console.log('Too many admin centres.', {relation:id});}
  if (lavel.length > 1) {console.log('Too many labels.', {relation:id});}


  doneCheckRelation();
}

function relationAsGeoJSON(id) {
  var relation = db.relations[id];
  var multipolygon = [];
  var polygon = [];
  var ring = [];
  var joinWithLast;
  var lastRole;


  _.each(relation.tags, function(tag){

  });

  function addToRing(geometry) {

    var joined = joinLines(ring, geometry);

    if (joined.length > 0) {
      ring = joined;
      return true;
    } else return false;

  }

  function closeRing() {
    if (ring.length > 0) {
      if (ring[0][0] != ring[ring.length-1][0] || ring[0][1] != ring[ring.length-1][1]) {
        throw {
          name: 'GeometryError',
          message: 'Geometry is not a MultiPolygon.',
          metadata: {
            relation: id,
            name: relation.tags.name
          }
        }
      }
      polygon.push(ring);
      ring = [];
    }
  }

  function closePolygon() {
    if (polygon.length > 0) {
      multipolygon.push(polygon);
      polygon = [];
    }
  }

  _.each(relation.members, function(m){

    if (m.role == 'outer' || m.role == 'inner') {


      // get geometry
      var wayGeometry = getWayGeometry(m.ref);

      // this should be the first member
      if (!lastRole) {
        ring = wayGeometry;

      // a step where role didn't change
      } if ((m.role == 'outer' && lastRole == 'outer') || (m.role == 'inner' && lastRole == 'inner')) {
        // if can't add to current ring, start a new one
        if (!addToRing(wayGeometry)) {
          closeRing();
          ring = wayGeometry;
        }

      // a step where a new polygon starts
      } else if (m.role == 'outer' && lastRole == 'inner') {
        closeRing();
        closePolygon();
        ring = wayGeometry;

      // a step where a new ring starts
      } else if (m.role == 'inner' && lastRole == 'outer') {
        closeRing();
        ring = wayGeometry;
      }

      lastRole = m.role;
    }
  })

  closeRing();
  closePolygon();


  relation.tags.osm_id = relation.id;

  return {
    type: 'Feature',
    properties: relation.tags,
    geometry: {
      type: 'MultiPolygon',
      coordinates: multipolygon
    }
  }

}


OSMDb.prototype.toTopoJSON = function() {

}

OSMDb.prototype.toGeoJSON = function(geojsonPath){
  var geojson = {
    type: 'FeatureCollection',
    features: []
  }

  var isValid = true;

  _.each(db.relations, function(r){
    try {
      geojson.features.push(relationAsGeoJSON(r.id));
    } catch(e){
      isValid = false;
      console.log(e.message, e.metadata);
    }
  })

  if (isValid) {
    fs.writeFile(geojsonPath, JSON.stringify(geojson), function(err){
      if (err) return console.log(err);
      console.log('GeoJSON saved successfully.');
    });
  } else {
    console.log('Invalid data, skipped GeoJSON creation.');
  }
}

OSMDb.prototype.updateCSV = function(csvPath){
  var propertiesCount = 0;
  var propertiesIndex = {};
  var properties = [];
  var positions = [];
  var data = [];

  // collect all properties
  _.each(db.relations, function(r){
    for ( property in r.tags ) {
      properties.push(property);
    }
    properties = _.uniq(properties);
  });

  // sort properties
  properties = _.sortBy(properties, function(h){ return h});

  _.each(db.relations, function(relation){
    var relationData = [relation.id, 'relation'];
    _.each(properties, function(property){
      relationData.push(relation.tags[property]);
    })
    data.push(relationData);
  });

  properties = ['osm_id', 'osm_type'].concat(properties);

  // add table header
  data = [properties].concat(data);

  stringify(data, function(err, csvString){
    fs.writeFile(csvPath, csvString, function(err){
      if (err) return console.log(err.message);
      console.log('CSV saved successfully.');
    });
  });

}


/**
 * File operations
 **/

OSMDb.prototype.loadFromFile = function(path, doneLoadFromFile){
  fs.readFile(path, function(err,data){
    if (err) doneLoadFromFile(err);
    else {
      db = JSON.parse(data);
      doneLoadFromFile();
    }
  })
}

OSMDb.prototype.saveToFile = function(path, doneLoadFromFile){
  fs.writeFile(path, JSON.stringify(db), doneLoadFromFile);
}


/**
* Update operations
**/

OSMDb.prototype.updateRelation = function(id, doneUpdateRelation){
  Overpass.get('(relation('+id+'););(._;>;);', function(err, results){
    if (err) return console.log(err);
    _.each(results['elements'], function(e){
      if (e.type == 'node') db.nodes[e.id] = e;
      else if (e.type == 'way') db.ways[e.id] = e;
      else if (e.type == 'relation') db.relations[e.id] = e;
    });
    doneUpdateRelation();
  });
}

/**
* Export operations
**/

OSMDb.prototype.toJSON = function(){
  return JSON.stringify(db);
}


/**
* Check operations
**/

OSMDb.prototype.checkRelation = function(id, doneCheckRelation) {

  var relation = db.relations[id];
  var members = relation.members;
  var admin_centre = [];
  var label = [];
  var rings = [];
  var previous_member;
  var errors = []; // [ relation_id, error_type, member_id (optional)]

  // sweep through relation
  _.each(members, function(member, i, list){

    var role = member.role;

    if (role) {
      if (role == 'admin_centre') { admin_centre.push(member); }
      if (role == 'label') { label.push(member); }
      if ((role == 'outer') || (role == 'inner')) {
        member.position = i;
        if (previous_member && previous_member.role == role) {
          rings[rings.length-1].push(member);
        } else {
          rings.push([member]);
          previous_member = member;
        }
      }
    } else {
      errors.push([id, 'member missing role', i]);
    }
  });

  if (admin_centre.length == 0) {
    console.log('Missing admin_centre.');
    errors.push('missing admin_centre');
  } else if (admin_centre.length > 1) {
    console.log('Too many admin centres.')
    errors.push('too many admin_centres');
  }

  if (label.length == 0) {
    console.log('Missing label.');
    errors.push('missing label');
  } else if (label.length > 1) {
    console.log('Too many labels.');
    errors.push('too many labels');
  }

  doneCheckRelation();
}

OSMDb.prototype.checkAllRelations = function(doneCheckAllRelations) {
  var self = this;
  var ids = _.map(db.relations, function(r) { return r.id});

  async.each(ids, self.checkRelation, doneCheckAllRelations);
}

module.exports = OSMDb;
