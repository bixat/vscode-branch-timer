import axios from 'axios';
import * as fs from 'fs';
import path = require('path');
import { workspace } from 'vscode';

// Function to check the API key
export async function checkApiKey(apiKey: string): Promise<boolean> {
    try {
        const response = await axios.get('https://your-api-endpoint.com/check-api-key');

        // Assuming the API returns a boolean indicating if the key is valid
        return response.data.isValid;
    } catch (error) {
        console.error('Error checking API key:', error);
        return false;
    }
}

// Function to post data from timerBranch.json
export async function postDataFromTimerBranchJson(apiKey: string, repo: string): Promise<void> {
    try {
        // Assuming you're targeting the first workspace folder
        const workspaceFolder = workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
            console.error('No workspace folder found');
            return;
        }

        const timerBranchJsonPath = path.join(workspaceFolder.uri.fsPath, '.vscode', 'timerBranch.json');
        const data = JSON.parse(fs.readFileSync(timerBranchJsonPath, 'utf8'));

        await axios.post('https://your-api-endpoint.com/post-data', data, {
            headers: {
                'authorization': `Token ${apiKey}`
            }
        });

        console.log('Data posted successfully');
    } catch (error) {
        console.error('Error posting data:', error);
    }
}
