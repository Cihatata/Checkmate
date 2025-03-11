const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');
const { URLSearchParams } = require('url');

// Debug environment variables
console.log('Environment variables:');
console.log('POEDITOR_API_TOKEN exists:', !!process.env.POEDITOR_API_TOKEN);
console.log('POEDITOR_PROJECT_ID exists:', !!process.env.POEDITOR_PROJECT_ID);
console.log('LANGUAGES:', process.env.LANGUAGES);
console.log('EXPORT_FORMAT:', process.env.EXPORT_FORMAT);

// POEditor API information
const API_TOKEN = process.env.POEDITOR_API_TOKEN;
const PROJECT_ID = process.env.POEDITOR_PROJECT_ID;
const LANGUAGES = (process.env.LANGUAGES || 'tr,en').split(',');
const EXPORT_FORMAT = process.env.EXPORT_FORMAT || 'key_value_json';

// POEditor API endpoint
const API_URL = 'https://api.poeditor.com/v2';

// Function to download translations
async function downloadTranslations() {
  try {
    console.log('Downloading translations from POEditor...');
    console.log(`Using export format: ${EXPORT_FORMAT}`);

    // Check if API token and project ID are provided
    if (!API_TOKEN) {
      throw new Error('POEditor API token is missing. Please set the POEDITOR_API_TOKEN environment variable.');
    }

    if (!PROJECT_ID) {
      throw new Error('POEditor project ID is missing. Please set the POEDITOR_PROJECT_ID environment variable.');
    }

    console.log(`Using API token: ${API_TOKEN.substring(0, 4)}...${API_TOKEN.substring(API_TOKEN.length - 4)}`);
    console.log(`Using project ID: ${PROJECT_ID}`);

    for (const language of LANGUAGES) {
      console.log(`Downloading translations for ${language} language...`);

      // Prepare request parameters
      const params = new URLSearchParams({
        api_token: API_TOKEN,
        id: PROJECT_ID,
        language: language,
        type: EXPORT_FORMAT
      });

      console.log('Request parameters:', params.toString());

      // Get export URL from POEditor
      try {
        const exportResponse = await axios.post(`${API_URL}/projects/export`, params);
        console.log('Export response status:', exportResponse.status);
        console.log('Export response data:', JSON.stringify(exportResponse.data));

        if (exportResponse.data.response.status !== 'success') {
          throw new Error(`Failed to get export URL for ${language} language: ${JSON.stringify(exportResponse.data)}`);
        }

        const fileUrl = exportResponse.data.result.url;
        console.log(`Export URL obtained for ${language}: ${fileUrl}`);

        // Download translation file
        const downloadResponse = await axios.get(fileUrl, { responseType: 'json' });
        console.log('Download response status:', downloadResponse.status);
        console.log('Download response data type:', typeof downloadResponse.data);

        const translations = downloadResponse.data;
        console.log(`Downloaded translations for ${language}`);

        // Check the format of data returned from POEditor and convert if necessary
        let formattedTranslations = translations;

        // If data is in array format, convert it to key-value format
        if (Array.isArray(translations)) {
          console.log(`Converting array format to key-value format for ${language}`);
          formattedTranslations = {};
          translations.forEach(item => {
            if (item.term && item.definition) {
              formattedTranslations[item.term] = item.definition;
            }
          });
        }

        // Save file
        const outputPath = path.join(process.cwd(), 'temp', `${language}.json`);
        await fs.writeJson(outputPath, formattedTranslations, { spaces: 2 });

        console.log(`Translations for ${language} language successfully downloaded and saved: ${outputPath}`);
      } catch (error) {
        console.error(`Error processing ${language} language:`, error.message);
        if (error.response) {
          console.error('Response data:', error.response.data);
          console.error('Response status:', error.response.status);
          console.error('Response headers:', error.response.headers);
        }
        throw error;
      }
    }

    console.log('All translations successfully downloaded!');
  } catch (error) {
    console.error('An error occurred while downloading translations:', error.message);
    process.exit(1);
  }
}

// Main function
async function main() {
  try {
    // Clean temp folder
    const tempDir = path.join(process.cwd(), 'temp');
    console.log(`Cleaning temp directory: ${tempDir}`);
    await fs.emptyDir(tempDir);

    // Download translations
    await downloadTranslations();
  } catch (error) {
    console.error('An error occurred during the process:', error.message);
    process.exit(1);
  }
}

// Run script
main(); 