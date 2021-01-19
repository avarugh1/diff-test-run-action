const core = require('@actions/core');
const github = require('@actions/github');

// File status options - 'added', 'removed', 'modified', 'renamed'

async function run(){
    try {
        const inputs = {
            token: core.getInput('repo-token', {required: true}),
        }

        const pr = github.context.payload.pull_request;
        const [ base, head, prNum ] = [ pr.base, pr.head, pr.number ];
        const message = 'Base is: ' + base.ref + '\nHead is: ' + head.ref;

        const octokit = github.getOctokit(inputs.token);
        // listFiles not explicitly documented anywhere..but ok
        const filesResponse = await octokit.pulls.listFiles({
            ...github.context.repo,
            pull_number: prNum,
        })
        console.log(filesResponse);

        let filesFiltered = {
            added: [],
            removed: [],
            modified: [],
            renamed: []
        };
        filesResponse.forEach(ele => {
            filesFiltered
        });
        /*const response = await octokit.issues.createComment({
            ...github.context.repo,
            issue_number: prNum,
            body: message
        });*/
        
        core.setOutput('baseBranchName', base.ref);
        core.setOutput('headBranchName', head.ref);
        core.setOutput('testStatus', 'test finished!');

    } catch(error) {
        core.setFailed(error.message);
    }
}

run();