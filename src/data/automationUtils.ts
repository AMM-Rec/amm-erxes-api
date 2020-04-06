import { Configs } from '../db/models';
import { IUserDocument } from '../db/models/definitions/users';
import { sendRPCMessage } from '../messageBroker';
import { graphqlPubsub } from '../pubsub';
import { IFinalLogParams } from './logUtils';
import { getEnv, sendRequest } from './utils';

const checkToken = async (apiKey: string, kind: string, body: any, user: IUserDocument) => {
  const NODE_ENV = getEnv({ name: 'NODE_ENV' });

  if (NODE_ENV === 'test') {
    return;
  }

  const data = {
    apiKey,
    ...body,
    userId: user._id,
    kind,
  };

  const apiTokensConfig = await Configs.getConfig('API_TOKENS');
  for (const tokenKey of Object.keys(apiTokensConfig.value)) {
    data.apiToken = apiTokensConfig[tokenKey];

    switch (tokenKey) {
      case 'exa':
        checkAutomation(data, user);
        break;

      case 'n8n':
        checkN8N(data, user);
        break;
    }
  }
};

const checkN8N = async (data: any, user: IUserDocument) => {
  const apiAutomationResponse = await sendRequest({
    url: 'http://localhost:5678/webhook/1/erxes%20trigger/webhook',
    method: 'POST',
    body: { ...data, user },
  });

  console.log('apiAutomationResponse', apiAutomationResponse);
};

const checkAutomation = async (data: any, user: IUserDocument) => {
  const apiAutomationResponse = await sendRPCMessage(
    {
      action: 'get-response-check-automation',
      data,
    },
    'rpc_queue:erxes-api_erxes-automations',
  );

  if (apiAutomationResponse.response.length === 0) {
    return;
  }

  try {
    const responseId = Math.random().toString();

    graphqlPubsub.publish('automationResponded', {
      automationResponded: {
        userId: user._id,
        responseId,
        sessionCode: user.sessionCode || '',
        content: apiAutomationResponse.response,
      },
    });
  } catch (e) {
    // Any other error is serious
    if (e.message !== 'Configuration does not exist') {
      throw e;
    }
  }
};

let automationKind = '';
let automationBody = {};

const changeDeal = async (params: IFinalLogParams) => {
  const updateDeal = params.updatedDocument || params.newData || params.object;
  const oldDeal = params.object;
  const destinationStageId = updateDeal.stageId || '';

  if (destinationStageId && destinationStageId !== oldDeal.stageId) {
    automationKind = 'changeDeal';
    automationBody = {
      deal: params.object,
      sourceStageId: oldDeal.stageId,
      destinationStageId,
    };
  }
};

const changeListCompany = async (params: IFinalLogParams) => {
  automationKind = 'changeListCompany';
  automationBody = {
    action: params.action,
    oldCode: params.object.code,
    doc: params.updatedDocument || params.newData || params.object,
  };
};

const changeListCustomer = async (params: IFinalLogParams) => {
  automationKind = 'changeListCustomer';
  automationBody = {
    action: params.action,
    oldCode: params.object.code,
    doc: params.updatedDocument || params.newData || params.object,
  };
};

const changeListProduct = async (params: IFinalLogParams) => {
  automationKind = 'changeListProduct';
  automationBody = {
    action: params.type === 'product-category' ? params.action.concat('Category') : params.action,
    oldCode: params.object.code,
    doc: params.updatedDocument || params.newData || params.object,
  };
};

export const automationHelper = async ({ params, user }: { params: IFinalLogParams; user: IUserDocument }) => {
  automationKind = '';
  automationBody = {};

  const apiKey = await Configs.getConfig('API_KEY');
  if (!apiKey) {
    return;
  }

  switch (params.type) {
    case 'deal':
      await changeDeal(params);
      break;

    case 'company':
      await changeListCompany(params);
      break;

    case 'customer':
      await changeListCustomer(params);
      break;

    case 'product':
      await changeListProduct(params);
      break;

    case 'product-category':
      await changeListProduct(params);

    default:
      break;
  }

  if (automationKind && Object.keys(automationBody).length > 0) {
    await checkToken(apiKey.value, automationKind, automationBody, user);
  }
};
