import axios from 'axios';
import * as fs from 'fs';
import getMetadata from '../common/getMetadata';
import getEndpoint from '../common/getEndpoint';
import FormData from 'form-data';
import type {
  Reporter, FullConfig
} from '@playwright/test/reporter';

class PublishLocalPlaywrightMetrics implements Reporter {
  junitOutputFile: string = "";

  onBegin(config: FullConfig) {
    this.junitOutputFile = "";
    const junitReporterConfig = config.reporter.find(([reporterName]) => reporterName === 'junit');
    if (!junitReporterConfig) {
      console.log('Skipping!! JUnit reporter not found');
      return;
    }
    const [, configObject] = junitReporterConfig;
    this.junitOutputFile = configObject.outputFile;
  }

  async onEnd() {
    if (!this.junitOutputFile) {
      return;
    }
    const endpoint: string = getEndpoint('playwright');
    const formdata = new FormData();
    Object.entries(getMetadata("playwright")).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        formdata.append(key, value);
      }
      formdata.append('files', fs.createReadStream(this.junitOutputFile));
    });
    try {
      await axios.post(endpoint, formdata, {
        headers: {
          "Content-Type": "multipart/form-data",
          "accept": 'application/json'
        },
        timeout: 30000
      });
      console.log(`Playwright Test results from ${this.junitOutputFile} successfully posted to ${endpoint}`);
    } catch (error) {
      console.error(`Failed posting Playwright test Results - ${this.junitOutputFile} to ${endpoint} from agoda-test-metrics`);
    }
  }
}

export default PublishLocalPlaywrightMetrics