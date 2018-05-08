/*---------------------------------------------------------------------------------------------
|  $Copyright: (c) 2018 Bentley Systems, Incorporated. All rights reserved. $
 *--------------------------------------------------------------------------------------------*/
import { Code, CodeState, MultiCode } from "../../imodelhub/Codes";
import { Briefcase } from "../../imodelhub/Briefcases";
import { ResponseBuilder, RequestType, ScopeType, UrlDiscoveryMock } from "../ResponseBuilder";
import { ECJsonTypeMap } from "../../ECJsonTypeMap";
import { TestConfig, UserCredentials } from "../TestConfig";
import { Guid } from "@bentley/bentleyjs-core";
import { UrlDescriptor, DeploymentEnv } from "../../Client";
import { AzureFileHandler } from "../../imodelhub/AzureFileHandler";

import { ChangeSet } from "../../imodelhub/ChangeSets";
import { Version } from "../../imodelhub/Versions";
import { IModelQuery } from "../../imodelhub/IModels";
import { IModelHubClient } from "../../imodelhub/Client";
import { AccessToken } from "../../Token";
import { UserProfile } from "../../UserProfile";
import { ConnectClient, Project } from "../../ConnectClients";

import * as fs from "fs";
import * as path from "path";
import { IModelHubBaseHandler } from "../../imodelhub/BaseHandler";

/** Other services */
class MockAccessToken extends AccessToken {
  public constructor() { super(""); }
  public getUserProfile(): UserProfile | undefined {
    return new UserProfile("test", "user", "testuser001@mailinator.com", "596c0d8b-eac2-46a0-aa4a-b590c3314e7c", "Bentley");
  }
  public toTokenString() { return ""; }
}

const imodelHubClient = new IModelHubClient(TestConfig.deploymentEnv, new AzureFileHandler());

export class IModelHubUrlMock {
  private static readonly urlDescriptor: UrlDescriptor = {
    DEV: "https://dev-imodelhubapi.bentley.com",
    QA: "https://qa-imodelhubapi.bentley.com",
    PROD: "https://imodelhubapi.bentley.com",
    PERF: "https://perf-imodelhubapi.bentley.com",
  };

  public static getUrl(env: DeploymentEnv): string {
    return this.urlDescriptor[env];
  }

  public static mockGetUrl(env: DeploymentEnv) {
    UrlDiscoveryMock.mockGetUrl(IModelHubBaseHandler.searchKey, env, this.urlDescriptor[env]);
  }
}

export const defaultUrl: string = IModelHubUrlMock.getUrl(TestConfig.deploymentEnv);

export function getDefaultClient() {
  IModelHubUrlMock.mockGetUrl(TestConfig.deploymentEnv);
  return imodelHubClient;
}

export const assetsPath = __dirname + "/../assets/";
/**
 * Generates request URL.
 * @param scope Specifies scope.
 * @param id Specifies scope id.
 * @param className Class name that request is sent to.
 * @param query Request query.
 * @returns Created URL.
 */
export function createRequestUrl(scope: ScopeType, id: string, className: string, query?: string): string {
  let requestUrl: string = "/v2.5/Repositories/";

  switch (scope) {
    case ScopeType.iModel:
      requestUrl += `iModel--${id}/iModelScope/`;
      break;
    case ScopeType.Project:
      requestUrl += `Project--${id}/ProjectScope/`;
      break;
    case ScopeType.Global:
      requestUrl += "Global--Global/GlobalScope/";
      break;
  }

  requestUrl += className + "/";
  if (query !== undefined) {
    requestUrl += query;
  }

  return requestUrl;
}

export async function login(user?: UserCredentials): Promise<AccessToken> {
  if (TestConfig.enableMocks)
    return new MockAccessToken();

  const authToken = await TestConfig.login(user);
  const client = getDefaultClient();

  return await client.getAccessToken(authToken);
}

export async function getProjectId(projectName?: string): Promise<string> {
  if (TestConfig.enableMocks)
    return Guid.createValue();

  const authToken = await TestConfig.login();
  const client = await new ConnectClient(TestConfig.deploymentEnv);
  const accessToken = await client.getAccessToken(authToken);

  projectName = projectName || TestConfig.projectName;
  const project: Project | undefined = await client.getProject(accessToken, {
    $select: "*",
    $filter: `Name+eq+'${projectName}'`,
  });
  if (!project || !project.wsgId)
    return Promise.reject(`Project with name ${TestConfig.projectName} doesn't exist.`);

  return Promise.resolve(project.wsgId);
}

/** iModels */
export async function deleteIModelByName(accessToken: AccessToken, projectId: string, imodelName: string): Promise<void> {
  if (TestConfig.enableMocks)
    return;

  const client = getDefaultClient();
  const imodels = await client.IModels().get(accessToken, projectId, new IModelQuery().byName(imodelName));
  for (const imodel of imodels) {
    await client.IModels().delete(accessToken, projectId, imodel.wsgId);
  }
}

export async function getIModelId(accessToken: AccessToken, imodelName: string): Promise<string> {
  if (TestConfig.enableMocks)
    return Guid.createValue();

  const projectId = await getProjectId();

  const client = getDefaultClient();

  const imodels = await client.IModels().get(accessToken, projectId, new IModelQuery().byName(imodelName));

  if (!imodels[0] || !imodels[0].wsgId)
    return Promise.reject(`iModel with name ${imodelName} doesn't exist.`);

  return imodels[0].wsgId;
}

export function mockFileResponse(downloadToPath: string, times = 1) {
  if (TestConfig.enableMocks)
    ResponseBuilder.mockFileResponse("https://imodelhubqasa01.blob.core.windows.net", "/imodelhubfile", downloadToPath + "empty-files/empty.bim", times);
}

/** Briefcases */
export async function getBriefcases(accessToken: AccessToken, imodelId: string, count: number): Promise<Briefcase[]> {
  if (TestConfig.enableMocks) {
    let briefcaseId = 2;
    const fileId = Guid.createValue();
    return Array(count).fill(0).map(() => {
      const briefcase = new Briefcase();
      briefcase.briefcaseId = briefcaseId++;
      briefcase.fileId = fileId;
      return briefcase;
    });
  }

  const client = getDefaultClient();
  let briefcases = await client.Briefcases().get(accessToken, imodelId);
  if (briefcases.length < count) {
    for (let i = 0; i < count - briefcases.length; ++i) {
      await client.Briefcases().create(accessToken, imodelId);
    }
    briefcases = await client.Briefcases().get(accessToken, imodelId);
  }
  return briefcases;
}

export function generateBriefcase(id: number): Briefcase {
  const briefcase = new Briefcase();
  briefcase.briefcaseId = id;
  briefcase.wsgId = id.toString();
  return briefcase;
}

export function mockGetBriefcase(iModelId: string, ...briefcases: Briefcase[]) {
  if (!TestConfig.enableMocks)
    return;

  const requestPath = createRequestUrl(ScopeType.iModel, iModelId, "Briefcase");
  const requestResponse = ResponseBuilder.generateGetArrayResponse<Briefcase>(briefcases);
  ResponseBuilder.mockResponse(defaultUrl, RequestType.Get, requestPath, requestResponse);
}

export function mockCreateBriefcase(iModelId: string, id: number) {
  if (!TestConfig.enableMocks)
    return;

  const requestPath = createRequestUrl(ScopeType.iModel, iModelId, "Briefcase");
  const postBody = ResponseBuilder.generatePostBody<Briefcase>(ResponseBuilder.generateObject<Briefcase>(Briefcase));
  const requestResponse = ResponseBuilder.generatePostResponse<Briefcase>(generateBriefcase(id));
  ResponseBuilder.mockResponse(defaultUrl, RequestType.Post, requestPath, requestResponse, 1, postBody);
}

/** ChangeSets */
export function generateChangeSetId(): string {
  let result = "";
  for (let i = 0; i < 20; ++i) {
    result += Math.floor(Math.random() * 256).toString(16).padStart(2, "0");
  }
  return result;
}

export function generateChangeSet(id?: string): ChangeSet {
  const changeSet = new ChangeSet();
  id = id || generateChangeSetId();
  changeSet.fileName = id + ".cs";
  changeSet.wsgId = id;
  return changeSet;
}

export function mockGetChangeSet(iModelId: string, getDownloadUrl: boolean, ...changeSets: ChangeSet[]) {
  if (!TestConfig.enableMocks)
    return;

  let i = 1;
  changeSets.forEach((value) => {
    if (getDownloadUrl)
      value.downloadUrl = "https://imodelhubqasa01.blob.core.windows.net/imodelhubfile";
    value.index = `${i++}`;
  });
  const requestPath = createRequestUrl(ScopeType.iModel, iModelId, "ChangeSet",
    getDownloadUrl ? `?$select=*,FileAccessKey-forward-AccessKey.DownloadURL` : undefined);
  const requestResponse = ResponseBuilder.generateGetArrayResponse<ChangeSet>(changeSets);
  ResponseBuilder.mockResponse(defaultUrl, RequestType.Get, requestPath, requestResponse);
}

/** Codes */
export function randomCodeValue(prefix: string): string {
  return (prefix + Math.floor(Math.random() * Math.pow(2, 30)).toString());
}

export function randomCode(briefcase: number): Code {
  const code = new Code();
  code.briefcaseId = briefcase;
  code.codeScope = "TestScope";
  code.codeSpecId = "0XA";
  code.state = CodeState.Reserved;
  code.value = randomCodeValue("TestCode");
  return code;
}

export function mockUpdateCodes(iModelId: string, ...codes: Code[]) {
  // assumes all have same scope / specId
  if (!TestConfig.enableMocks)
    return;

  const multiCode = new MultiCode();
  multiCode.briefcaseId = codes[0].briefcaseId;
  multiCode.codeScope = codes[0].codeScope;
  multiCode.codeSpecId = codes[0].codeSpecId;
  multiCode.state = codes[0].state;
  multiCode.values = codes.map((value) => value.value!);
  multiCode.changeState = "new";

  const requestPath = `/v2.5/Repositories/iModel--${iModelId}/$changeset`;
  const requestResponse = ResponseBuilder.generateChangesetResponse<MultiCode>([multiCode]);
  const postBody = ResponseBuilder.generateChangesetBody<MultiCode>([multiCode]);
  ResponseBuilder.mockResponse(defaultUrl, RequestType.Post, requestPath, requestResponse, 1, postBody);
}

export function mockDeniedCodes(iModelId: string, ...codes: Code[]) {
  // assumes all have same scope / specId
  if (!TestConfig.enableMocks)
    return;

  const multiCode = new MultiCode();
  multiCode.briefcaseId = codes[0].briefcaseId;
  multiCode.codeScope = codes[0].codeScope;
  multiCode.codeSpecId = codes[0].codeSpecId;
  multiCode.state = codes[0].state;
  multiCode.values = codes.map((value) => value.value!);
  multiCode.changeState = "new";

  const requestPath = `/v2.5/Repositories/iModel--${iModelId}/$changeset`;
  const requestResponse = ResponseBuilder.generateError("iModelHub.CodeReservedByAnotherBriefcase", "", "",
    new Map<string, any>([
      ["ConflictingCodes", JSON.stringify(codes.map((value) => {
        const obj = ECJsonTypeMap.toJson<Code>("wsg", value);
        return obj.properties;
      }))],
    ]));
  const postBody = ResponseBuilder.generateChangesetBody<MultiCode>([multiCode]);
  ResponseBuilder.mockResponse(defaultUrl, RequestType.Post, requestPath, requestResponse, 1, postBody, undefined, 409);
}

/** Named versions */
export function generateVersion(name?: string, changesetId?: string): Version {
  const result = new Version();
  result.wsgId = Guid.createValue();
  result.changeSetId = changesetId || generateChangeSetId();
  result.name = name || `TestVersion-${result.changeSetId!}`;
  return result;
}

export function mockGetVersions(imodelId: string, ...versions: Version[]) {
  if (!TestConfig.enableMocks)
    return;

  const requestPath = createRequestUrl(ScopeType.iModel, imodelId, "Version");
  const requestResponse = ResponseBuilder.generateGetArrayResponse<Version>(versions);
  ResponseBuilder.mockResponse(defaultUrl, RequestType.Get, requestPath, requestResponse);
}

export function mockGetVersionById(imodelId: string, version: Version) {
  if (!TestConfig.enableMocks)
    return;

  const requestPath = createRequestUrl(ScopeType.iModel, imodelId, "Version", version.wsgId);
  const requestResponse = ResponseBuilder.generateGetResponse<Version>(version);
  ResponseBuilder.mockResponse(defaultUrl, RequestType.Get, requestPath, requestResponse);
}

export function mockCreateVersion(iModelId: string, name?: string, changesetId?: string) {
  if (!TestConfig.enableMocks)
    return;

  const requestPath = createRequestUrl(ScopeType.iModel, iModelId, "Version");
  const postBodyObject = generateVersion(name, changesetId);
  delete (postBodyObject.wsgId);
  const postBody = ResponseBuilder.generatePostBody<Version>(postBodyObject);
  const requestResponse = ResponseBuilder.generatePostResponse<Version>(generateVersion(name, changesetId));
  ResponseBuilder.mockResponse(defaultUrl, RequestType.Post, requestPath, requestResponse, 1, postBody);
}

export function mockUpdateVersion(iModelId: string, version: Version) {
  if (!TestConfig.enableMocks)
    return;

  const requestPath = createRequestUrl(ScopeType.iModel, iModelId, "Version", version.wsgId);
  const postBody = ResponseBuilder.generatePostBody<Version>(version);
  const requestResponse = ResponseBuilder.generatePostResponse<Version>(version);
  ResponseBuilder.mockResponse(defaultUrl, RequestType.Post, requestPath, requestResponse, 1, postBody);
}

/** Integration utilities */
export function getMockSeedFilePath() {
  const dir = path.join(assetsPath, "SeedFile");
  return path.join(dir, fs.readdirSync(dir).find((value) => value.endsWith(".bim"))!);
}

export async function createNewIModel(client: IModelHubClient, accessToken: AccessToken, name: string, projectId: string) {
  if (TestConfig.enableMocks)
    return;

  const imodelPath = getMockSeedFilePath();
  await client.IModels().create(accessToken, projectId, name, imodelPath);
}

export async function createIModel(accessToken: AccessToken, name: string, projectId?: string, deleteIfExists = false) {
  if (TestConfig.enableMocks)
    return;

  projectId = projectId || await getProjectId(TestConfig.projectName);

  const client = getDefaultClient();
  const imodels = await client.IModels().get(accessToken, projectId, new IModelQuery().byName(name));

  if (imodels.length > 0) {
    if (deleteIfExists) {
      await client.IModels().delete(accessToken, projectId, imodels[0].wsgId);
    } else {
      return;
    }
  }

  await createNewIModel(client, accessToken, name, projectId);
}

export function getMockChangeSets(briefcase: Briefcase): ChangeSet[] {
  const dir = path.join(assetsPath, "SeedFile");
  const files = fs.readdirSync(dir);
  let parentId = "";
  return files.filter((value) => value.endsWith(".cs") && value.length === 45).map((file) => {
    const result = new ChangeSet();
    const fileName = path.basename(file, ".cs");
    result.id = fileName.substr(2);
    result.fileSize = fs.statSync(path.join(dir, file)).size.toString();
    result.briefcaseId = briefcase.briefcaseId;
    result.seedFileId = briefcase.fileId;
    result.parentId = parentId;
    parentId = result.id;
    return result;
  });
}

export function getMockChangeSetPath(index: number, changeSetId: string) {
  return path.join(assetsPath, "SeedFile", `${index}_${changeSetId!}.cs`);
}

export async function createChangeSets(accessToken: AccessToken, imodelId: string, briefcase: Briefcase,
  startingId = 0, count = 1): Promise<ChangeSet[]> {
  if (TestConfig.enableMocks)
    return getMockChangeSets(briefcase).slice(startingId, startingId + count);

  const maxCount = 10;

  if (startingId + count > maxCount)
    throw Error(`Only have ${maxCount} changesets generated`);

  const client = getDefaultClient();

  const currentCount = (await client.ChangeSets().get(accessToken, imodelId)).length;

  const changeSets = getMockChangeSets(briefcase);

  const result: ChangeSet[] = [];
  for (let i = currentCount; i < startingId + count; ++i) {
    const changeSetPath = getMockChangeSetPath(i, changeSets[i].id!);
    const changeSet = await client.ChangeSets().create(accessToken, imodelId, changeSets[i], changeSetPath);
    result.push(changeSet);
  }
  return result;
}
