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
    temperature: 0.9,
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
    {text: "Provide one random elementary-level Japanese word in the following format:\n{\n\"hiragana\": word,\n\"katakana\": word,\n\"kanji\": word,\n\"romaji\": romaji,\n\"pronunciation\": pronunciation,\n\"definition\": definition,\n\"part_of_speech\": part of speech of the word,\n\"sentence\": provide an example sentence using the word,\n\"sentence_romaji\" : provide a romaji version of the example sentence,\n\"sentence_translation\": translate the example sentence into English\n}"},
  ];

  try {
    let past_words = fs.readFileSync(`./past_words.txt`, 'utf8');
    if (past_words) {
      past_words = past_words.trim().replaceAll('\n', ',');
      parts.push({text: "Do not return the following words: "+past_words});
    }
  } catch (err) {}

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
  let template = fs.readFileSync(`./template.html`, 'utf8');
  let styles = fs.readFileSync(`./style.css`, 'utf8');
  run().then((data) => {
    console.log(data);
    const word = JSON.parse(data);
    // Replace all the template variables with the word data.
    for (let key of Object.keys(word)) {
      template = template.replace(`{{${key}}}`, word[key]);
    }
    // Replace page styles.
    template = template.replace('{{css}}', styles);
    // If there is a previous page, link the back button to it.
    if (fs.existsSync(`./pages/${last}.html`)) {
      template = template.replace('{{back_href}}', `href="/pages/${last}.html"`);
    }
    // Write the index.html file and add the word to the past_words.txt file.
    fs.writeFileSync(`./index.html`, template);
    fs.appendFileSync(`./past_words.txt`, `${word['kanji']}\n`);
  });
}


// Rename index.html to the last word and move it to the pages folder.
function moveIndexToPages(last) {
  fs.copyFile(`./index.html`, `./pages/${last}.html`, (err) => {
    if (err) throw err;
  });
}

// Update the forward button to point to the next page.
function linkForwardButton(page, nextPage) {
  let template = fs.readFileSync(page, 'utf8');
  if (nextPage) {
    // Point page to the former index page's new name.
    template = template.replace(`href="/index.html"`, `href="${nextPage}"`);
  } else {
    // Point former index page to index.html
    template = template.replace('{{forward_href}}', `href="/index.html"`);
  }
  fs.writeFileSync(page, template);
}

function start() {
  fs.readFile(`./past_words.txt`, 'utf8', (err, data) => {
    if (err) {
      // Create initial index page if the file doesn't exist.
      createIndexPage(null);
    }
    if (data) {
      // Get the last two words from past_words.txt.
      let past_words = data.trim().split('\n');
      let last = past_words.pop();
      if (last) {
        // Update index.html to point to index.html and rename it to the word.html.
        linkForwardButton(`./index.html`);
        moveIndexToPages(last);
      }
      let second = past_words.pop();
      if (second) {
        // Update the most recent word file to point at the renamed file that was the index.
        linkForwardButton(`./pages/${second}.html`, `/pages/${last}.html`);
      }
      // Create new index page.
      createIndexPage(last);
    }
  });
}

start();