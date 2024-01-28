#!/usr/bin/env node
require('dotenv').config({path: ".env"});
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

  let past_words = '';
  if (fs.existsSync(`${__dirname}/past_words.txt`)) {
    past_words = fs.readFileSync(`${__dirname}/past_words.txt`, 'utf8').trim().replaceAll('\n', ', ');
  }

  const parts = [
    {text: "Provide one random elementary-level Japanese word in the following format:\n{\n\"hiragana\": word,\n\"katakana\": word,\n\"kanji\": word,\n\"romaji\": romaji,\n\"pronunciation\": pronunciation,\n\"definition\": definition,\n\"part_of_speech\": part of speech of the word,\n\"sentence\": provide an example sentence using the word,\n\"sentence_romaji\" : provide a romaji version of the example sentence,\n\"sentence_translation\": translate the example sentence into English\n}\nDo not return the following words: ["+past_words+"]"},
  ];

  const result = await model.generateContent({
    contents: [{ role: "user", parts }],
    generationConfig,
    safetySettings,
  });

  const response = result.response;
  return response.text();
}

// Create index page, add data to template, save index.html.
function createIndexPage(last) {
  let template = fs.readFileSync(`${__dirname}/template.html`, 'utf8');
  let styles = fs.readFileSync(`${__dirname}/style.css`, 'utf8');
  run().then((data) => {
    const word = JSON.parse(data);
    for (let key of Object.keys(word)) {
      template = template.replace(`{{${key}}}`, word[key]);
    }
    template = template.replace('{{css}}', styles);
    if (fs.existsSync(`${__dirname}/pages/${last}.html`)) {
      template = template.replace('<a id="back"><</a>', `<a id="back" href="${process.env.OUT_PATH}/pages/${last}.html"><</a>`);
    }
    fs.writeFileSync(`${__dirname}/index.html`, template);
    fs.appendFileSync(`${__dirname}/past_words.txt`, `${word['kanji']}\n`);
  });
}

function updateAndCopy(last, currentPage, curr, second = false) {
  let template = fs.readFileSync(currentPage, 'utf8');
  if (second) {
    template = template.replace(`<a id="forward" href="${process.env.OUT_PATH}/index.html">></a>`, `<a id="forward" href="${curr}">></a>`);
  } else {
    template = template.replace('<a id="forward">></a>', `<a id="forward" href="${curr}">></a>`);
  }
  fs.writeFileSync(currentPage, template);
  fs.copyFile(currentPage, `${__dirname}/pages/${last}.html`, (err) => {
    if (err) throw err;
  });
}

function copyIndexToPages() {
  // If past words have been recorded, process older files.
  if (fs.existsSync(`${__dirname}/past_words.txt`)) {
    let past_words = fs.readFileSync(`${__dirname}/past_words.txt`, 'utf8').trim().split('\n');
    let last = past_words.pop();
    if (last) {
      // Update index.html to point to index.html and rename it to the word.html.
      updateAndCopy(last, `${__dirname}/index.html`, `${process.env.OUT_PATH}/index.html`);
    }
    let second = past_words.pop();
    if (second) {
      // Update the most recent word file to point at the renamed file that was the index.
      updateAndCopy(second, `${__dirname}/pages/${second}.html`, `${process.env.OUT_PATH}/pages/${last}.html`, true);
    }
    // Create new index page.
    createIndexPage(last);
  } else {
    // Create initial index page.
    createIndexPage(null);
  }
}

copyIndexToPages();