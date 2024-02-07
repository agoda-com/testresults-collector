import axios from 'axios';
import getMetadata from '../common/getMetadata';
import { IMetadata, IJestTestResults } from '../common/types';

function publishJestMetrics(result: any) {
    const JEST_TESTDATA_API_URL: string = process.env.JEST_TESTDATA_API_URL
        ? process.env.JEST_TESTDATA_API_URL
        : 'http://your_domain/your_jest_api'; // TODO change to your api endpoint

    const metadata: IMetadata = getMetadata('jest');
    const payload: IJestTestResults = {
        ...metadata,
        testCaseSummary: result,
    };

    axios.post(JEST_TESTDATA_API_URL, payload, {
        headers: {
            'Content-Type': 'application/json',
            'accept': '*/*',
        },
        timeout: 30000,
    }).then(_ => {
        console.log(`Jest Test results successfully posted to ${JEST_TESTDATA_API_URL}`);
    }).catch(error => {
        console.error(`Failed posting Jest test Results to ${JEST_TESTDATA_API_URL} from @agoda-com/test-metrics`);
    });
    return result;
}

export default publishJestMetrics;