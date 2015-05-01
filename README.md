# Estados brasileiros

Informações básicas sobre estados brasileiros em [CSV](https://en.wikipedia.org/wiki/Comma-separated_values) e  [GeoJSON](https://en.wikipedia.org/wiki/GeoJSON), formatos de dados abertos.

* [estados.csv]
* [estados.geojson]

Os dados são do OpenStreetMap e estão sob licença [Open Database License (ODbL)](http://wiki.openstreetmap.org/wiki/Open_Database_License).


## Atualizando os dados

Clone o repositório em um diretório local, por exemplo:

    mkdir data
    cd ~/data
    git clone https://github.com/mapaslivres/estados

Você deve ter o [Node.js](www.nodejs.org) instalado. Entre no diretório e instale as dependências:

    cd estados
    npm install

Baixe os dados do OpenStreetMap:

    ./estados --cache

Atualize os dados atuais com os dados do OpenStreetMap:

    ./estados --update

Se houver algum erro com a geometria da relação de fronteira do estado no OpenStreetMap, o arquivo [estados.csv] será atualizado e o [estados.geojson] será mantido na última versão, que não deve ter erros.


[estados.csv]: (data/estados.csv)
[estados.geojson]: (data/estados.geojson)
