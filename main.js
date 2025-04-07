// import dotenv from "dotenv";
// import fs from "fs";
const fs = require('fs')
const dotenv = require('dotenv');
const { Octokit } = require("octokit");
dotenv.config();
const axios = require("axios")

const appId = process.env.APP_ID;
const webhookSecret = process.env.WEBHOOK_SECRET;
const privateKeyPath = process.env.PRIVATE_KEY_PATH;
const oauth = process.env.OAUTH; // this is all that is needed - PAT - which admin can give read-access to. (faily certain)

const privateKey = fs.readFileSync(privateKeyPath, "utf8");

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

// This defines a POST route at the `/webhook` path. 
app.post('/webhook', express.json({type: 'application/json'}), (request, response) => {

  response.status(202).send('Accepted');

  // Check the `x-github-event` header to learn what event type was sent.
  const githubEvent = request.headers['x-github-event'];


  if (githubEvent === 'issues') {
    const data = request.body;
    //console.log(data)
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
    console.log(data)
    const fileNames = data.map(file => file.name); 
    console.log(fileNames)
    const fileURLs = data.map(file => file.download_url)
    console.log(fileURLs)
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
    console.log(fileNames)
    const fileURLs = data.map(file => file.download_url)
    console.log(fileURLs)
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
    console.log(data)
    const fileNames = data.map(file => file.name); 
    console.log(fileNames)
    const fileURLs = data.map(file => file.download_url)
    console.log(fileURLs)
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



