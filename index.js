const core = require('@actions/core');
const github = require('@actions/github');

function filterEligibleFiles(ele){
    const inDirectory = 'tests/';
    const extension = '.js';
    const fileContainsText = 'test('; // think a little bit more about this

    const isInDir = ele[filename].includes(inDirectory);
    const fileExt = (ele[filename].slice(-3) === extension);
    return (isInDir && fileExt);
}

async function checkValidFiles(octokit, filesFiltered){
    let message = '';
    Object.keys(filesFiltered).forEach(ele => {
        filesFiltered[ele].filter(filterEligibleFiles);
        if(filesFiltered[ele].length > 0){
            message += (ele.charAt(0).toUpperCase() + ele.slice(1) + " Files are:\n");

            filesFiltered[ele].forEach(ele2 => {
                message += (ele2[filename] + '\n');
            });
            message += '\n';
        }
    });

    const response = await octokit.issues.createComment({
        ...github.context.repo,
        issue_number: prNum,
        body: message
    });
}


async function run(){
    try {
        const inputs = {
            token: core.getInput('repo-token', {required: true}),
        }

        const pr = github.context.payload.pull_request;
        const [ base, head, prNum ] = [ pr.base, pr.head, pr.number ];
        const message = 'Base is: ' + base.ref + '\nHead is: ' + head.ref;

        const octokit = github.getOctokit(inputs.token);
        const filesResponse = await octokit.pulls.listFiles({
            ...github.context.repo,
            pull_number: prNum,
        })

        // File status options - 'added', 'removed', 'modified', 'renamed'
        let filesFiltered = {
            added: [],
            removed: [],
            modified: [],
            renamed: []
        };
        filesResponse.data.forEach(ele => {
            filesFiltered[ele.status].push(ele);
        });

        checkValidFiles(octokit, filesFiltered);
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