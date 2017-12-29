const request = require('superagent');
const cheerio = require('cheerio');
const _ = require('lodash');
const csvStringify = require('csv-stringify-as-promised');

const url = 'http://www.nderf.org/NDERF/NDE_Archives/archives_main.htm';
const questions = {
  before: 'What was your religion prior to your experience?',
  change: 'Have your religious practices changed since your experience?',
  now: 'What is your religion now?',
};

const getData = html => _.mapValues(
  questions,
  question => cheerio.load(html)(`span:contains("${question}")`).parent().text()
    .replace(question, '')
    .trim()
);

const filterData = (record) => {
  const values = _.values(record);

  return values.every(value => value.length < 1000) &&
    values.some(value => value.length);
};

(async () => {
  const mainText = (await request(url)).text;
  const $ = cheerio.load(mainText);
  const links = $('a').toArray().map(link => link.attribs.href).filter(link => /[0-9]{4}/.test(link));
  const finalLinks = _.flatten(
    await Promise.all(
      links.map(
        link => request(link)
          .then(({ text }) => cheerio.load(text)('section.section_offset a').toArray()
            .map(detailedLink => detailedLink.attribs.href))
      )
    )
  )
    .filter(link => /\.html$/.test(link)).splice(0, 1000);
  const data = await Promise.all(
    finalLinks.map(link => request(link).then(({ text }) => getData(text)).catch(error => console.error(error)))
  );
  const outputData = data.filter(filterData);
  console.log(await csvStringify(outputData));
})();
