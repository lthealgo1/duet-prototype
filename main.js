const express = require('express');
const app = express();

// import api_get_request function, will use it for every URL returned by Webhook when an event occurs.
// Handler for AWS Lambda. 

// This defines a POST route at the `/webhook` path. 
app.post('/webhook', express.json({type: 'application/json'}), (request, response) => {

  response.status(202).send('Accepted');

  // Check the `x-github-event` header to learn what event type was sent.
  const githubEvent = request.headers['x-github-event'];


  if (githubEvent === 'issues') {
    const data = request.body;
    console.log(data)
    const issue_url = data.issue.url;
    const login = data.issue.user.login;
    const action = data.action;
    if (action === 'opened') {
      console.log(`An issue was opened with this title: ${data.issue.title} by user: ${login}.`);
    } else if (action === 'closed') {
      console.log(`An issue was closed by ${data.issue.user.login}.`);
    } else {
      console.log(`Unhandled action for the issue event: ${action} by ${login}.`);
    }
    console.log(issue_url);// will be needed for -> repo_code = api_get_request(pr_url)... this function is not finished yet
    
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
    console.log(push_url);// will be needed for -> repo_code = api_get_request(push_url)... this function is not finished yet

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
    const pr_url = pull_request.url;
    console.log(pr_url);// will be needed for -> repo_code = api_get_request(pr_url)... this function is not finished yet
    
    // api_get_request function in separate file will also need a Personal Access token and a Github actions token - will be located in .gitignore
    
    // once repo_code is returned, db_api called to store the code in a table / sent straight to script with Anthropic plugin.

  } 

  else if (githubEvent === 'fork') {
    const data = request.body;
    const author = data.sender.login; 
    const repo = data.forkee.repository;
    const fork_url = data.forkee.url;

    console.log(`A fork request was made by ${author} from repo ${repo}.`)
    console.log(fork_url)// will be needed for -> repo_code = api_get_request(pr_url)... this function is not finished yet
    
    // api_get_request function in separate file will also need a Personal Access token and a Github actions token - will be located in .gitignore
    
    // once repo_code is returned, db_api called to store the code in a table / sent straight to script with Anthropic plugin.
  }

  else {
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



