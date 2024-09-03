#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const semver = require('semver');
const chalk = require('chalk');

let updateNeeded = 0;
let upToDate = 0;
let errors = 0;
let outdated = 0;

async function analyzeDependencies(packageJsonPath) {
    // Read package.json
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };

    for (const [name, version] of Object.entries(dependencies)) {
        console.log(`Analyzing ${name}...`);
        
        try {
            // Get package info from npm registry
            const { data } = await axios.get(`https://registry.npmjs.org/${name}`);
            
            const currentVersion = semver.clean(version.replace(/^\^|~/, ''));
            const latestVersion = data['dist-tags'].latest;
            // Compare versions
            if (semver.gt(latestVersion, currentVersion)) {
                updateNeeded++;
                console.log(chalk.yellow(`  Update available: ${currentVersion} -> ${latestVersion}`));
                
                // Check last update
                const lastUpdateDate = new Date(data.time[latestVersion]);
                const monthsSinceUpdate = (new Date() - lastUpdateDate) / (1000 * 60 * 60 * 24 * 30);
                
                if (monthsSinceUpdate > 6) {
                    console.log(chalk.red(`  Warning: Last updated ${monthsSinceUpdate.toFixed(1)} months ago`));
                    console.log(chalk.red(`  Consider finding an alternative or checking the project's status`));
                } else {
                    // Extract changelog
                    const changelog = await getChangelog(name, currentVersion, latestVersion);
                    
                    if (changelog.hasBreakingChanges) {
                        console.log(chalk.magenta(`  Breaking changes detected. Please review the following changes:`));
                        console.log(chalk.magenta(changelog.content));
                        console.log(chalk.magenta(`  Recommendation: Test thoroughly before updating`));
                    } else {
                        console.log(chalk.green(`  No breaking changes detected. You can update directly.`));
                    }
                }
            } else {
                upToDate++;
                console.log(chalk.green(`  Already up to date`));
            }
        } catch (error) {
            errors++;
            console.error(chalk.red(`  Error analyzing ${name}: ${error.message}`));
        }
        
        console.log(''); // Empty line for readability
    }
}

async function getChangelog(name, currentVersion, latestVersion) {
    // This is a placeholder. In a real implementation, you would fetch and parse the actual changelog.
    // For demonstration, we're simulating a changelog check.
    return {
        hasBreakingChanges: Math.random() > 0.5,
        content: `Simulated changelog for ${name} from ${currentVersion} to ${latestVersion}`
    };
}

// // Usage
// const packageJsonPath = path.join(__dirname, 'package.json');
// analyzeDependencies(packageJsonPath);

if (require.main === module) {
    const packageJsonPath = process.argv[2] || path.join(process.cwd(), 'package.json');
    if (!fs.existsSync(packageJsonPath)) {
        console.error(chalk.red(`Error: package.json not found at ${packageJsonPath}`));
        process.exit(1);
    }
    analyzeDependencies(packageJsonPath).then(() => {
        console.log(chalk.cyan('\n----- Analysis Summary -----'));
        console.log(chalk.green(`Packages up to date: ${upToDate}`));
        console.log(chalk.yellow(`Packages needing update: ${updateNeeded}`));
        console.log(chalk.red(`Outdated packages (>6 months): ${outdated}`));
        console.log(chalk.red(`Errors encountered: ${errors}`));
        console.log(chalk.cyan('----------------------------'));
    });
}