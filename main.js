// import dotenv from "dotenv";
// import fs from "fs";
// const fs = require('fs')
const dotenv = require('dotenv');
const { Octokit } = require("octokit");
dotenv.config();
const axios = require("axios");
const diff = require('diff');

// const appId = process.env.APP_ID;
// const webhookSecret = process.env.WEBHOOK_SECRET;
const privateKeyPath = process.env.PRIVATE_KEY_PATH;
const oauth = process.env.OAUTH; // this is all that is needed - PAT - which admin can give read-access to. (faily certain)

// const privateKey = fs.readFileSync(privateKeyPath, "utf8");

// const app = new App({
//   appId: appId,
//   privateKey: privateKey,
//   webhooks: {
//     secret: webhookSecret
//   },
// });

const express = require('express');
const app = express();
const octokit = new Octokit ({
  auth: oauth
})

async function processLines(data) {
  //console.log('processLines data:',data);
  const numberedLinesPerFile = data.map((fileContent, fileIndex) => {
    const lines = fileContent.split('\n'); 
    const numberedLines = {};

    lines.forEach((line, index) => {
      numberedLines[index + 1] = line;
    });

    return { fileIndex: fileIndex + 1, numberedLines }; 
  });

  //console.log('numberedLinesPerFile:', numberedLinesPerFile);
  return numberedLinesPerFile;
}


async function fetchProcessedFiles(urls) {
  try {
    const responses = await Promise.all(urls.map(url => axios.get(url))); // Fetch all URLs at once
    // const contents = responses.map(res => res.data); // Extract content
    //console.log('fetchProcessedFiles responses:',responses);
    const contents = responses.map(file => file.data);
    //console.log('fetchProcessedFiles contents:',contents);
    const processed_contents = await processLines(contents);
    //console.log('fetchProcessedFiles processed_contents:',processed_contents);
    return processed_contents;
  } catch (error) {
    console.error("Error fetching files:", error.message);
  }
}


// to be added to start endpoint to clone full repo
async function createFullFilesDict(owner,repo,githubEvent) {
  try {
      octokit.request('GET /repos/{owner}/{repo}/contents/{path}', {
      owner: owner,
      repo: repo,
      path: '',
      headers: {
        "Accept": "application/vnd.github.v3.raw+json",
        'X-GitHub-Api-Version': '2022-11-28'
    }})
    .then(response => {

      // const {content, download_url} = response.data;
    //console.log(response.data);
    const data = response.data;
    // console.log('createFullFilesDict data:',data);
    const fileNames = data.map(file => file.name); 
    const fileURLs = data.map(file => file.download_url);
    // download using urls comes next
    async function getContents(githubEvent) {
      contents = await fetchProcessedFiles(fileURLs);
      //console.log('getContents contents:',contents);
      const numberedLinesList = contents.map(file => file.numberedLines);
      //console.log('numberedLinesList:',numberedLinesList);
      const fileObjects = fileNames.map((filename, index) => ({
          filename,
          filedata: numberedLinesList[index]

    }));
    //console.log('fileObjects:',fileObjects);
      const fileData = {
        header: {
          name: `Repo: ${repo}`,
          time_created: new Date().toISOString(),
          event_type: githubEvent

        },
        files: fileObjects
      };
    console.log('Repo:')
    console.log(JSON.stringify(fileData, null, 2)); 
    }
    const fileData2 = getContents(githubEvent)  
    return fileData2
    })}
  catch (error) {
    console.error("Error fetching files:", error.message);
  }
}



async function extractAddedLinesWithNumbers(patch) {
  const lines = patch.split('\n');
  const addedLines = [];
  let currentLineNumber = null;

  lines.forEach(line => {
    if (line.startsWith('@@')) {
      const match = line.match(/\+(\d+)/);
      if (match) {
        currentLineNumber = parseInt(match[1], 10); 
      }
    } else if (line.startsWith('+') && !line.startsWith('+++')) {
      if (currentLineNumber !== null) {
        addedLines.push({ lineNumber: currentLineNumber, content: line.substring(1).trim() });
        currentLineNumber++; 
      }
    } else if (!line.startsWith('-') && !line.startsWith('---')) {
      if (currentLineNumber !== null) {
        currentLineNumber++;
      }
    }
  });

  return addedLines;
}

function extractAddedLines(patch) {
  const lines = patch.split('\n');
  const addedLines = lines.filter(line => line.startsWith('+') && !line.startsWith('+++')); // Exclude metadata
  return addedLines.map(line => line.substring(1)); // Remove the '+' prefix
}

async function fetchFiles(urls) {
  try {
    const responses = await Promise.all(urls.map(url => axios.get(url))); // Fetch all URLs at once
    // const contents = responses.map(res => res.data); // Extract content
    const contents = responses.map(file => file.data);
    return contents;
  } catch (error) {
    console.error("Error fetching files:", error.message);
  }
}


// Handler for AWS Lambda. 

app.post('/setup', express.json({type: 'application/json'}), (request, response) => {
  response.status(200).send('Setup request accepted');

  const owner_id = request.body.owner;
  const repo_id = request.body.repo;
  octokit.request('GET /repos/{owner}/{repo}/contents/{path}', {
      owner: owner_id,
      repo: repo_id,
      path: '',
      headers: {
        "Accept": "application/vnd.github.v3.raw+json",
        'X-GitHub-Api-Version': '2022-11-28'
    }})
    .then(response => {

      // const {content, download_url} = response.data;
    //console.log(response.data);
    const data = response.data;
    const fileNames = data.map(file => file.name); 
    const fileURLs = data.map(file => file.download_url);

    // download using urls comes next
    async function getContents() {
      contents = await fetchFiles(fileURLs);
      const fileObjects = fileNames.map((filename, index) => ({
      filename,
      data: contents[index]

      }));
      const fileData = {
        header: {
          name: `Repo: ${repo_name}`,
          time_created: new Date().toISOString(),
          event_type: 'Initialization',
        },
        files: fileObjects
      }
      console.log(fileData)
      return fileData
    }
    getContents()
    })
  // repo is cloned upon initialization
  // stored in db 

  const fileOrDiff = request.body.fileOrDiff;
  const initialized_at = new Date().toISOString();
  const repo_name = request.body.repo_name;
  // these details are stored in db as well. Of particular interest is fileOrDiff, 
  // which will dictate whether upon each change/fix, either affected files are sent 
  // by the API, or only the difference in each file using diff in diff functionality
  // provided by Github's API.

  // for now I will default this to diff in diff - i.e. full files not sent.
  
  console.log('Setup complete');

});


const processedDeliveryIds = new Set();// for whatever reason, pull_requests are sent twice. hence the need for deduplication

// this defines a POST route at the `/webhook` path. 
app.post('/webhook', express.json({type: 'application/json'}), (request, response) => {

  response.status(202).send('Accepted');

  // Check the `x-github-event` header to learn what event type was sent.
  const githubEvent = request.headers['x-github-event'];


  if (githubEvent === 'issues') {
    const data = request.body;
    const login = data.issue.user.login;
    const action = data.action;

    const owner = data.repository.owner.login;
    const repo = data.repository.name;
    const path = data.repository.full_name;
    if (action === 'opened') {
      console.log(`An issue was opened with this title: ${data.issue.title} by user: ${login}.`);
    } else if (action === 'closed') {
      console.log(`An issue was closed by ${data.issue.user.login}.`);
    } else {
      console.log(`Unhandled action for the issue event: ${action} by ${login}.`);
    }
    octokit.request('GET /repos/{owner}/{repo}/contents/{path}', {
      owner: owner,
      repo: repo,
      path: '',
      headers: {
        "Accept": "application/vnd.github.v3.raw+json",
        'X-GitHub-Api-Version': '2022-11-28'
    }})
    .then(response => {

      // const {content, download_url} = response.data;
    //console.log(response.data);
    const data = response.data;
    const fileNames = data.map(file => file.name); 
    const fileURLs = data.map(file => file.download_url);

    // download using urls comes next
    async function getContents() {
      contents = await fetchFiles(fileURLs);
      const fileObjects = fileNames.map((filename, index) => ({
      filename,
      data: contents[index]

      }));
      const fileData = {
        header: {
          name: `Repo: ${repo}`,
          time_created: new Date().toISOString(),
          event_type: githubEvent

        },
        files: fileObjects
      }
      console.log(fileData)
      return fileData
    }
    getContents()
    })

    // console.log(issue_url);
    // will be needed for -> repo_code = api_get_request(pr_url)... this function is not finished yet
    // api_get_request function in separate file will also need a Personal Access token and a Github actions token - will be located in .gitignore
    // once repo_code is returned, db_api called to store the code in a table / sent straight to script with Anthropic plugin.
  } 
  
  else if (githubEvent === 'ping') {
    console.log(`GitHub sent the ping event, by user: ${login}`);
  } 

  else if (githubEvent === 'push') {
    const data = request.body;
    const repname = data.repository.name;
    const author = data.sender.login;
    const push_url = data.commits.url;
    console.log(`A push was made by author ${author} to repository: ${repname}`);

    const owner = data.repository.owner.login;
    const repo = data.repository.name;
    const path = data.repository.full_name;
    octokit.request('GET /repos/{owner}/{repo}/contents/{path}', {
      owner: owner,
      repo: repo,
      path: '',
      headers: {
        "Accept": "application/vnd.github.v3.raw+json",
        'X-GitHub-Api-Version': '2022-11-28'
    }})
    .then(response => {

      // const {content, download_url} = response.data;
    //console.log(response.data);
    const data = response.data;
    const fileNames = data.map(file => file.name); 
    const fileURLs = data.map(file => file.download_url)
    // download using urls comes next
    async function getContents() {
      contents = await fetchFiles(fileURLs);
      const fileObjects = fileNames.map((filename, index) => ({
      filename,
      data: contents[index]

      }));
      const fileData = {
        header: {
          name: `Repo: ${repo}`,
          time_created: new Date().toISOString(),
          event_type: githubEvent

        },
        files: fileObjects
      }
      console.log(fileData)
      return fileData
    }
    getContents()
    })
    // will be needed for -> repo_code = api_get_request(push_url)... this function is not finished yet

    // api_get_request function in separate file will also need a Personal Access token and a Github actions token - will be located in .gitignore

    // once repo_code is returned, db_api called to store the code in a table / sent straight to script with Anthropic plugin.
  }

  else if (githubEvent === 'pull_request') {
    const data = request.body;
    const action = data.action;
    const login = data.pull_request.user.login;
    const change = data.pull_request.title;
    const created_at = data.pull_request.created_at;
    const updated_at = data.pull_request.updated_at;

    const deliveryId = request.headers['x-github-delivery']; // Unique ID for each webhook event
    if (processedDeliveryIds.has(deliveryId)) {
      //console.log(`Duplicate event detected: ${deliveryId}. Ignoring.`);
      return;
  }
    processedDeliveryIds.add(deliveryId);

    if (processedDeliveryIds.size > 100) {
      processedDeliveryIds.clear(); // Adjust the threshold as needed
    }
    if (action === 'opened') {
      console.log(`A pull request, with change(s) ${change} was opened by user: ${login}.\nCreated at ${created_at}, updated at ${updated_at}`);
    }
    else if (action === 'closed') {
      console.log(`A pull request, with change(s) ${change} was closed by user: ${login}.\nCreated at ${created_at}, updated at ${updated_at}`);
    }
    // const pr_url = pull_request.url;
    // console.log(pr_url);
    const owner = data.repository.owner.login;
    const repo = data.repository.name;
    const pull_number = data.number;
    // console.log(data);
    octokit.request('GET /repos/{owner}/{repo}/pulls/{pull_number}/files', {
      owner: owner,
      repo: repo,
      pull_number: pull_number,
      headers: {
        "Accept": "application/vnd.github.v3.raw+json",
        'X-GitHub-Api-Version': '2022-11-28'
    }})
    .then(response => {
    const filesChanged = response.data;
    const changedFilesList = [];
    filesChanged.forEach(file => {
      if (file.patch) {
        changedFilesList.push(file.filename); // Add each filename to the list
      }
    console.log(`Files changed in PR #${pull_number}:`, changedFilesList);
    filesChanged.forEach(file => {
    if (file.patch) {
      console.log(`Processing patch for file: ${file.filename}`);
      const addedLines = extractAddedLinesWithNumbers(file.patch);
      console.log('Added lines:', addedLines);
    } else {
      console.log(`No patch available for file: ${file.filename}`);
    }
  });
  })
  })
  .catch(error => {
    console.error('error:', error.message);

  });
      
  const full_repo = createFullFilesDict(owner,repo,githubEvent);
  console.log(full_repo);

    // will be needed for -> repo_code = api_get_request(pr_url)... this function is not finished yet
    
    // api_get_request function in separate file will also need a Personal Access token and a Github actions token - will be located in .gitignore
    
    // once repo_code is returned, db_api called to store the code in a table / sent straight to script with Anthropic plugin.

  } 

  else if (githubEvent === 'fork') {
    const data = request.body;
    const author = data.sender.login; 
    const repo_forked = data.forkee.repository;
    const fork_url = data.forkee.url;

    console.log(`A fork request was made by ${author} from repo ${repo_forked}.`)

    const owner = data.repository.owner.login;
    const repo = data.repository.name;
    const path = data.repository.full_name;
    octokit.request('GET /repos/{owner}/{repo}/contents/{path}', {
      owner: owner,
      repo: repo,
      path: '',
      headers: {
        "Accept": "application/vnd.github.v3.raw+json",
        'X-GitHub-Api-Version': '2022-11-28'
    }})
    .then(response => {

      // const {content, download_url} = response.data;
    //console.log(response.data);
    const data = response.data;
    const fileNames = data.map(file => file.name); 
    const fileURLs = data.map(file => file.download_url)
    // download using urls comes next
    async function getContents() {
      contents = await fetchFiles(fileURLs);
      const fileObjects = fileNames.map((filename, index) => ({
      filename,
      data: contents[index]

      }));
      const fileData = {
        header: {
          name: `Repo: ${repo}`,
          time_created: new Date().toISOString(),
          event_type: githubEvent

        },
        files: fileObjects
      }
      console.log(fileData)
      return fileData
    }
    getContents()
    })


    // will be needed for -> repo_code = api_get_request(pr_url)... this function is not finished yet
    // api_get_request function in separate file will also need a Personal Access token and a Github actions token - will be located in .gitignore
    // once repo_code is returned, db_api called to store the code in a table / sent straight to script with Anthropic plugin.
  }
  else if (githubEvent === 'create') {
    const data = request.body;
    const author = data.sender.login; 
    const created_repo = data.repository.name;
    const ref = data.ref;
    const branch = data.master_branch;

    console.log(`A creation with reference ${ref} was made by ${author} from repo ${created_repo} branch ${branch}.`)

    const owner = data.repository.owner.login;
    const repo = data.repository.name;
    const path = data.repository.full_name;
    octokit.request('GET /repos/{owner}/{repo}/contents/{path}', {
      owner: owner,
      repo: repo,
      path: '',
      headers: {
        "Accept": "application/vnd.github.v3.raw+json",
        'X-GitHub-Api-Version': '2022-11-28'
    }})
    .then(response => {

      // const {content, download_url} = response.data;
    //console.log(response.data);
    const data = response.data;
    const fileNames = data.map(file => file.name); 
    const fileURLs = data.map(file => file.download_url)
    // download using urls comes next
    async function getContents() {
      contents = await fetchFiles(fileURLs);
      const fileObjects = fileNames.map((filename, index) => ({
      filename,
      data: contents[index]

      }));
      const fileData = {
        header: {
          name: `Repo: ${repo}`,
          time_created: new Date().toISOString(),
          event_type: githubEvent

        },
        files: fileObjects
      }
      console.log(fileData)
      return fileData
    }
    getContents()
    })

  }

  else {
    response.status(400).send('Bad request');
    console.log(`Unhandled event: ${githubEvent}`);
    const data = request.body;
    console.log(data);
  }
});


// change needed when running on a different server. 
const port = 3000;

// This starts the server and tells it to listen at the specified port.
app.listen(port, () => {
  console.log(`\n\nDuet server is running on port ${port}\n\n`);
});



