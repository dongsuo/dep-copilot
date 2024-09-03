const axios = require('axios');
const semver = require('semver');

async function getChangelog(name, currentVersion, latestVersion) {
    try {
        // Get package info from npm registry
        const { data: npmData } = await axios.get(`https://registry.npmjs.org/${name}`);
        
        // Get all versions between current and latest
        const allVersions = Object.keys(npmData.versions)
            .filter(v => semver.gt(v, currentVersion) && semver.lte(v, latestVersion))
            .sort(semver.compare);

        let changelog = '';
        let hasBreakingChanges = false;

        // Try to find changelog
        const changelogUrl = npmData.versions[latestVersion].changelog;
        const repoUrl = npmData.repository?.url;
        let changelogContent = '';

        if (changelogUrl) {
            const { data } = await axios.get(changelogUrl);
            changelogContent = data;
        } else if (repoUrl) {
            const githubRepo = repoUrl.match(/github\.com\/(.+?)(\.git)?$/)[1];
            try {
                const { data } = await axios.get(`https://raw.githubusercontent.com/${githubRepo}/master/CHANGELOG.md`);
                changelogContent = data;
            } catch (error) {
                const { data: readme } = await axios.get(`https://raw.githubusercontent.com/${githubRepo}/master/README.md`);
                changelogContent = readme;
            }
        }

        if (changelogContent) {
            const parsedChangelog = parseChangelog(changelogContent, allVersions);
            changelog = parsedChangelog.content;
            hasBreakingChanges = parsedChangelog.hasBreakingChanges;
        } else {
            changelog = `Unable to fetch detailed changelog for ${name} from ${currentVersion} to ${latestVersion}`;
        }

        return {
            hasBreakingChanges,
            content: changelog
        };
    } catch (error) {
        console.error(`Error fetching changelog for ${name}: ${error.message}`);
        return {
            hasBreakingChanges: false,
            content: `Unable to fetch changelog for ${name} from ${currentVersion} to ${latestVersion}`
        };
    }
}

function parseChangelog(content, versions) {
    const lines = content.split('\n');
    let relevantChanges = [];
    let hasBreakingChanges = false;
    let currentVersion = null;

    for (const line of lines) {
        if (line.toLowerCase().includes('breaking change')) {
            hasBreakingChanges = true;
        }

        const versionMatch = line.match(/^#+\s*(v?\d+\.\d+\.\d+)/i);
        if (versionMatch) {
            currentVersion = versionMatch[1].replace(/^v/, '');
        }

        if (currentVersion && versions.includes(currentVersion)) {
            relevantChanges.push(line);
        }
    }

    return {
        hasBreakingChanges,
        content: relevantChanges.join('\n')
    };
}

module.exports = getChangelog;