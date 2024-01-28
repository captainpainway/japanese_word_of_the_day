#!/usr/bin/env node
require('dotenv').config();
const fs = require("fs");

const {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
} = require("@google/generative-ai");

const MODEL_NAME = "gemini-pro";
const API_KEY = process.env.API_KEY;

async function run() {
  const genAI = new GoogleGenerativeAI(API_KEY);
  const model = genAI.getGenerativeModel({ model: MODEL_NAME });

  const generationConfig = {
    temperature: 0.5,
    topK: 1,
    topP: 1,
    maxOutputTokens: 2048,
  };

  const safetySettings = [
    {
      category: HarmCategory.HARM_CATEGORY_HARASSMENT,
      threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE,
    },
    {
      category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
      threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE,
    },
    {
      category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
      threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE,
    },
    {
      category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
      threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE,
    },
  ];

  const parts = [
    {text: "Provide one random elementary-level Japanese word in the following format:\n{\n\"hiragana\": word,\n\"katakana\": word,\n\"kanji\": word,\n\"romaji\": romaji,\n\"pronunciation\": pronunciation,\n\"definition\": definition,\n\"part_of_speech\": part of speech of the word,\n\"sentence\": provide an example sentence using the word,\n\"sentence_romaji\" : provide a romaji version of the example sentence,\n\"sentence_translation\": translate the example sentence into English\n}\nDo not return the following words: []"},
  ];

  const result = await model.generateContent({
    contents: [{ role: "user", parts }],
    generationConfig,
    safetySettings,
  });

  const response = result.response;
  return response.text();
}

function createIndexPage(date) {
  let template = fs.readFileSync(`__dirname/template.html`, 'utf8');
  let styles = fs.readFileSync(`__dirname/style.css`, 'utf8');
  run().then((data) => {
    const word = JSON.parse(data);
    for (let key of Object.keys(word)) {
      template = template.replace(`{{${key}}}`, word[key]);
    }
    template = template.replace('{{css}}', styles);
    let previousPage = `${__dirname}/pages/${getPastDate(1)}.html`;
    if (fs.existsSync(previousPage)) {
      template = template.replace('<a id="back"><</a>', `<a id="back" href="${previousPage}"><</a>`);
    }
    fs.writeFileSync('./index.html', template);
  });
}

function getPastDate(numDays) {
  const date = new Date();
  date.setDate(date.getDate() - numDays);
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  return `${year}${month}${day}`;
}

function updateAndCopy() {
  let template = fs.readFileSync(`${__dirname}/template.html`, 'utf8');
  let previousPage = `${__dirname}/pages/${getPastDate(2)}.html`;
  if (fs.existsSync(previousPage)) {
    template = template.replace('<a id="forward">></a>', `<a id="forward" href="${__dirname}/index.html">></a>`);
  }
  fs.copyFile('./index.html', `./pages/${getPastDate(1)}.html`, (err) => {
    if (err) throw err;
  });
}

function updateYesterday() {

}

function copyIndexToPages() {
  updateAndCopy()
  createIndexPage();
}

copyIndexToPages();