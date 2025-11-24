import { APIGatewayProxyResult } from 'aws-lambda';
import { getSecret, SecretsKeys } from 'utils';
import { getAuth0Token, topLevelCatch, ZambdaInput } from '../../shared';

let zapehrToken: string;

export const index = async (input: ZambdaInput): Promise<APIGatewayProxyResult> => {
  console.log('get-z3-download-link');
  console.log(`Input: ${JSON.stringify(input)}`);
  try {
    if (!zapehrToken) {
      console.log('getting token');
      zapehrToken = await getAuth0Token(input.secrets);
    } else {
      console.log('already have token');
    }

    const PROJECT_API = getSecret(SecretsKeys.PROJECT_API, input.secrets);
    const PROJECT_ID = getSecret(SecretsKeys.PROJECT_ID, input.secrets);

    const [basket, ...path] = input.body && JSON.parse(input.body).z3Url.replace('z3://', '').split('/');

    const options = {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        authorization: `Bearer ${zapehrToken}`,
        'x-oystehr-project-id': PROJECT_ID,
      },
      body: JSON.stringify({ action: 'download' }),
    };

    const download = await fetch(`${PROJECT_API}/z3/${basket}/${path}`, options);
    const result = await download.json();

    return {
      statusCode: 200,
      body: JSON.stringify(result),
    };
  } catch (error: any) {
    await topLevelCatch('get-z3-download-link', error, getSecret(SecretsKeys.ENVIRONMENT, input.secrets));
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal error' }),
    };
  }
};
