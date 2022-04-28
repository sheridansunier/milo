/*
 * Copyright 2021 Adobe. All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
 * OF ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 */
/* global */
const LOC_CONFIG = '/drafts/localization/configs/config.json';
const GLAAS_API_PREFIX = '/api/l10n/v1.1/tasks';
const DEFAULT_WORKFLOW = 'Standard';
const GRAPH_API = 'https://graph.microsoft.com/v1.0';

let decoratedConfig;

async function fetchConfigJson(configPath) {
  const configResponse = await fetch(configPath);
  if (!configResponse.ok) {
    throw new Error('Config not found!');
  }
  return configResponse.json();
}

function getLocalesConfig(config) {
  return config.locales.data;
}

async function getDecoratedLocalesConfig(localesConfig) {
  const decoratedLocalesConfig = {};
  localesConfig.forEach((localeConfig) => {
    decoratedLocalesConfig[localeConfig.locale] = {
      path: localeConfig.path,
      workflow: localeConfig.workflow,
      language: localeConfig.language,
    };
  });
  return decoratedLocalesConfig;
}

function getWorkflowsConfig(config) {
  const workflows = {};
  config.workflows.data.forEach((workflow) => {
    workflows[workflow.name] = workflow;
  });
  return workflows;
}

async function getWorkflowForLocale(config, locale, decoratedLocales) {
  const localeConfig = decoratedLocales[locale];
  const workflow = localeConfig?.workflow ? localeConfig.workflow : DEFAULT_WORKFLOW;
  return {
    name: workflow,
    ...getWorkflowsConfig(config)[workflow],
  };
}

function getGLaaSRedirectURI() {
  const location = new URL(window.location.href);
  return encodeURI(`${location.origin}/tools/translation/glaas.html`);
}

async function getDecoratedGLaaSConfig(config, decoratedLocales, workflowsConfig) {
  return {
    ...config.glaas.data[0],
    workflows: workflowsConfig,
    authorizeURI: '/api/common/sweb/oauth/authorize',
    redirectURI: getGLaaSRedirectURI(),
    accessToken: null,
    api: {
      session: {
        check: {
          uri: '/api/common/v1.0/checkSession',
        },
      },
    },
    localeApi: async (locale) => {
      const workflow = await getWorkflowForLocale(config, locale, decoratedLocales);
      const { product, project, workflowName } = workflow;
      const baseURI = `${GLAAS_API_PREFIX}/${product}/${project}`;
      return {
        tasks: {
          create: {
            uri: `${baseURI}/create`,
            payload: {
              workflowName,
              contentSource: 'Adhoc',
            },
          },
          get: {
            baseURI: `${baseURI}`,
          },
          getAll: {
            uri: `${baseURI}`,
          },
          updateStatus: {
            baseURI: `${baseURI}`,
          },
          assets: {
            baseURI: `${baseURI}`,
          },
        },
      };
    },
  };
}

function getSharepointConfig(config) {
  const sharepointConfig = config.sp.data[0];
  const baseURI = `${sharepointConfig.site}/drive/root:${sharepointConfig.rootFolders}`;
  return {
    ...sharepointConfig,
    clientApp: {
      auth: {
        clientId: sharepointConfig.clientId,
        authority: sharepointConfig.authority,
      },
    },
    login: {
      redirectUri: '/tools/translation/spauth',
    },
    api: {
      url: GRAPH_API,
      file: {
        get: {
          baseURI,
        },
        download: {
          baseURI: `${sharepointConfig.site}/drive/items`,
        },
        upload: {
          baseURI,
          method: 'PUT',
        },
        createUploadSession: {
          baseURI,
          method: 'POST',
          payload: {
            '@microsoft.graph.conflictBehavior': 'replace',
          },
        },
      },
      directory: {
        create: {
          baseURI,
          method: 'PATCH',
          payload: {
            folder: {},
          },
        },
      },
      batch: {
        uri: `${GRAPH_API}/$batch`,
      },
    },
  };
}

function getHelixAdminConfig() {
  const adminServerURL = 'https://admin.hlx3.page';
  return {
    api: {
      status: {
        baseURI: `${adminServerURL}/status`,
      },
      preview: {
        baseURI: `${adminServerURL}/preview`,
      },
    },
  };
}

async function getConfig(configPath = LOC_CONFIG) {
  if (!decoratedConfig) {
    const configJson = await fetchConfigJson(configPath);
    const locales = await getLocalesConfig(configJson);
    const decoratedLocales = await getDecoratedLocalesConfig(locales);
    const workflowsConfig = getWorkflowsConfig(configJson);
    decoratedConfig = {
      locales,
      decoratedLocales,
      glaas: await getDecoratedGLaaSConfig(configJson, decoratedLocales, workflowsConfig),
      sp: getSharepointConfig(configJson),
      admin: getHelixAdminConfig(),
      async getPathForLocale(locale) {
        const localeConfig = decoratedLocales[locale];
        return localeConfig?.path ? localeConfig.path : null;
      },
      async getWorkflowForLocale(locale) {
        return getWorkflowForLocale(configJson, locale, decoratedLocales);
      },
    };
  }
  return decoratedConfig;
}

export default getConfig;
