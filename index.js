const core = require('@actions/core');
const github = require('@actions/github');
const fs = require('fs');
const { execSync } = require('child_process');


// figure out ncc error with index.js collision
/*const createTestCafe = require('testcafe');
async function runTests(filesFiltered){
    let testArr = [];
    Object.values(filesFiltered).forEach(ele => {
        ele.forEach(ele2 => {
            testArr.push(ele2.filename);
        })
    });
    const testCafe = await createTestCafe('localhost', 1337, 1338);
    try {
        const runner = testCafe.createRunner();

        await runner
            .src(testArr)
            .browsers('chrome:headless')
            .reporter('json', 'github-action-report.json')
            .run({ quarantineMode: true });
    }
    finally {
        await testCafe.close();
    }
}*/

let message = '';
let prNum = 0;
let octokit;

async function parseResults(reportName){
    let data = JSON.parse(fs.readFileSync(reportName));
    console.log(JSON.stringify(data, null, 2));

    let errAndUnstable = [];
    let unstableOnly = [];
    let errOnly = [];

    for(let i = 0; i < data.fixtures.length; i++){
        const fixture = data.fixtures[i];
        for(let j = 0; j < fixture.tests.length; j++){
            const test = fixture.tests[j];
            if(test.errs.length > 0){
                errOnly.push({
                    name: test.name,
                    path: fixture.path
                });
            }
        }
    }

    if((errAndUnstable.length + unstableOnly.length + errOnly.length) === 0){
        message += 'Great news: no tests were unstable or had errors!'
    }else{
        core.setFailed('Tests have failed or were unstable!');
        message += 'Uh oh, some tests had errors or were unstable!\n\n'
        message += '| Path | Test Name |\n';
        message += '| --------------- | --------------- |\n';
        let outputArr = errAndUnstable.concat(unstableOnly).concat(errOnly);
        outputArr.forEach(ele => message += ('| ' + ele.path + ' | ' + ele.name + ' | \n'));  
    }

    const response = await octokit.issues.createComment({
        ...github.context.repo,
        issue_number: prNum,
        body: message
    });
}

async function runTests(filesFiltered){
    let testArr = [];
    Object.values(filesFiltered).forEach(ele => {
        ele.forEach(ele2 => {
            testArr.push(ele2.filename);
        })
    });

    if(testArr.length > 0) {
        // dirty workaround from https://github.com/DevExpress/testcafe-action/blob/master/index.js
        // due to index.js collision 
        let testcafeCmd = 'npx testcafe chrome:headless ' + testArr.join(' ') + 
                            ' --skip-js-errors --skip-uncaught-errors ' + '-r json:github-action-report.json';

        execSync(`npm i testcafe`);
        try{
            execSync(`${testcafeCmd}`, { stdio: 'inherit' });
        }catch(error) {} // handle this
        console.log('done with npm commands');
        parseResults('github-action-report.json');
        console.log('done with report parse commands');
    }
}

function filterEligibleFiles(ele){
    const inDirectory = 'tests/';
    const extension = '.js';
    const fileContainsText = 'test('; // think a little bit more about this

    const isInDir = ele.filename.includes(inDirectory);
    const fileExt = (ele.filename.slice(-3) === extension);
    return (isInDir && fileExt);
}

async function checkValidFiles(filesFiltered){
    // for all the original added, removed, modified, renamed arrays
    Object.keys(filesFiltered).forEach(ele => {
        // Only use the eligible test files based on our file filter criteria
        filesFiltered[ele] = filesFiltered[ele].filter(filterEligibleFiles);

        // display files which will run to the user
        if(filesFiltered[ele].length > 0){
            message += 'Hello! Friendly test checker here! Looks like some test file changes were made.\n'
            message += 'I\'ll help you out by checking their stability! Good luck!\n\n'
            message += (ele.charAt(0).toUpperCase() + ele.slice(1) + " Files are:\n");

            filesFiltered[ele].forEach(ele2 => {
                message += (ele2.filename + '\n');
            });
            message += '\n';
        }
    });
}

async function run(){
    try {
        const inputs = {
            token: core.getInput('repo-token', {required: true}),
        }

        const pr = github.context.payload.pull_request;
        prNum = pr.number;
        const [ base, head ] = [ pr.base, pr.head ];
        const message = 'Base is: ' + base.ref + '\nHead is: ' + head.ref;

        octokit = github.getOctokit(inputs.token);
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

        checkValidFiles(filesFiltered);
        runTests(filesFiltered);
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