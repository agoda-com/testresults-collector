import axios from 'axios';
import getMetadata from '../common/getMetadata';
import getEndpoint from '../common/getEndpoint';
import { IMetadata, IJestTestResults } from '../common/types';

function publishJestMetrics(result: any) {
    const endpoint: string = getEndpoint('jest');

    const metadata: IMetadata = getMetadata('jest');
    const payload: IJestTestResults = {
        ...metadata,
        testCaseSummary: result,
    };

    axios.post(endpoint, payload, {
        headers: {
            'Content-Type': 'application/json',
            'accept': '*/*',
        },
        timeout: 30000,
    }).then(_ => {
        console.log(`Jest Test results successfully posted to ${endpoint}`);
    }).catch(error => {
        console.error(`Failed posting Jest test Results to ${endpoint} from agoda-test-metrics`);
    });
    return result;
}

export default publishJestMetrics;