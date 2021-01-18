const core = require('@actions/core');
const github = require('@actions/github');

async function run(){
    const inputs = {
        token: core.getInput('repo-token', {required: true}),
    }

    const ctx = github.context;
    const base = ctx.payload.before;
    const head = ctx.payload.after;

    core.setOutput('testStatus', 'test finished!');
}

run();