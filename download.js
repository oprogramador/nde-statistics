const request = require('superagent');
const cheerio = require('cheerio');
const _ = require('lodash');

const url = 'http://www.nderf.org/NDERF/NDE_Archives/archives_main.htm';
const beforeQuestion = 'What was your religion prior to your experience?';

const getData = html => cheerio.load(html)(`span:contains("${beforeQuestion}")`).parent().text();

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
    .filter(link => /\.html$/.test(link)).splice(0, 100);
  const data = await Promise.all(
    finalLinks.map(link => request(link).then(({ text }) => getData(text)).catch(error => console.error(error)))
  );
  console.log(data.filter(x => x.length < 1000));
})();
