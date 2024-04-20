import axios from 'axios';
import path = require('path');

// Function to check the API key
export async function checkApiKey(apiKey: string): Promise<boolean> {
    try {
        const response = await axios.get(`http://127.0.0.1:8000/check_api_key?api_key=${apiKey}`);
        return response.data.isValid;
    } catch (error) {
        console.error('Error checking API key:', error);
        return false;
    }
}

// Function to post data from timerBranch.json
export async function postDataFromTimerBranchJson(apiKey: string, data: any): Promise<void> {
    try {
        // Assuming you're targeting the first workspace folder
        // const workspaceFolder = workspace.workspaceFolders?.[0];
        // if (!workspaceFolder) {
        //     console.error('No workspace folder found');
        //     return;
        // }

        // const timerBranchJsonPath = path.join(workspaceFolder.uri.fsPath, '.vscode', 'timerBranch.json');
        // const data = JSON.parse(fs.readFileSync(timerBranchJsonPath, 'utf8'));

        await axios.post('http://127.0.0.1:8000/capture_duration/', data, {
            headers: {
                "Authorization": `Token ${apiKey}`
            }
        });

        console.log('Data posted successfully');
    } catch (error) {
        console.error('Error posting data:', error);
    }
}
