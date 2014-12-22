'use strict';

var path = require('path');
var decode = require('urlencode').decode;
var PDFParser = require('pdf2json/pdfparser');

module.exports = function (file) {
  return parse(file)
    .then(toLines)
    .then(toObject);
};

function parse(file) {
  return new Promise(function (resolve, reject) {
    var pdfParser = new PDFParser();
    file = path.resolve(process.cwd(), file);

    var cb = function (err, data) {
      err ? reject(err) : resolve(data.data || {});
    };

    pdfParser.once('pdfParser_dataReady', cb.bind(null, null));
    pdfParser.once('pdfParser_dataError', cb);

    pdfParser.loadPDF(file);
  });
}

function toLines(data) {
  var pages = data.Pages || [];
  var lines = [];
  var line;
  var prev;
  var pos;

  pages.forEach(function (page) {
    page.Texts.forEach(function (text) {
      if (!line || pos !== text.y) {
        lines.push(line);
        line = [];
        pos = text.y;
      }

      line.push(decode(text.R[0].T));
    });
  });

  return lines;
}

function toObject(lines) {
  lines = lines.slice(2);

  var list = [];
  var isCode = RegExp.prototype.test.bind(/^\d+$/);

  var createState = function () {
    return {
      data: {
        name: '',
        code: '',
        shortname: ''
      }
    };
  };

  lines.reduce(function (state, line) {
    if (line.length === 1) {
      if (isCode(line[0])) {
        state.data.code = line[0];
        list.push(state.data);
        return createState();
      }
      state.data.name += line[0];
      state.offset = true;
      return state;
    }

    if (state.offset) {
      state.data.code = line[0];
      state.data.shortname = line[1];
    } else {
      state.data.name = line[0];
      state.data.code = line[1];
      state.data.shortname = line[2];
    }

    list.push(state.data);

    return createState();
  }, createState());

  return list;
}
