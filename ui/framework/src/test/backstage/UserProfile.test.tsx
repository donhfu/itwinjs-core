/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
import * as React from "react";
import * as sinon from "sinon";
import { mount } from "enzyme";

import { UserInfo } from "@bentley/itwin-client";

import { UserProfileBackstageItem } from "../../ui-framework/backstage/UserProfile";
import TestUtils, { mockUserInfo } from "../TestUtils";
import { FrontstageManager } from "../../ui-framework";

describe("UserProfileBackstageItem", () => {

  // cSpell:ignore testuser mailinator saml

  const getNoEmailProfileUserInfo = (): UserInfo => {
    const id = "596c0d8b-eac2-46a0-aa4a-b590c3314e7c";
    const organization = { id: "fefac5b-bcad-488b-aed2-df27bffe5786", name: "Bentley" };
    const featureTracking = { ultimateSite: "1004144426", usageCountryIso: "US" };
    return new UserInfo(id, undefined, undefined, organization, featureTracking);
  };

  const getEmailArrayUserInfo = (): UserInfo => {
    const id = "596c0d8b-eac2-46a0-aa4a-b590c3314e7c";
    const email = { id: ["testuser001@mailinator.com"] as unknown as string };
    const organization = { id: "fefac5b-bcad-488b-aed2-df27bffe5786", name: "Bentley" };
    const featureTracking = { ultimateSite: "1004144426", usageCountryIso: "US" };
    return new UserInfo(id, email, undefined, organization, featureTracking);
  };

  const getEmailEmptyArrayUserInfo = (): UserInfo => {
    const id = "596c0d8b-eac2-46a0-aa4a-b590c3314e7c";
    const email = { id: [] as unknown as string };
    const organization = { id: "fefac5b-bcad-488b-aed2-df27bffe5786", name: "Bentley" };
    const featureTracking = { ultimateSite: "1004144426", usageCountryIso: "US" };
    return new UserInfo(id, email, undefined, organization, featureTracking);
  };

  before(async () => {
    await TestUtils.initializeUiFramework();
  });

  after(() => {
    TestUtils.terminateUiFramework();
  });

  it("should render", () => {
    const wrapper = mount(<UserProfileBackstageItem userInfo={mockUserInfo()} />);
    wrapper.unmount();
  });

  it("should render with an UserInfo with no Email or Profile", () => {
    const wrapper = mount(<UserProfileBackstageItem userInfo={getNoEmailProfileUserInfo()} />);
    wrapper.unmount();
  });

  it("should render with an UserInfo with Email array", () => {
    const wrapper = mount(<UserProfileBackstageItem userInfo={getEmailArrayUserInfo()} />);
    wrapper.unmount();
  });

  it("should render with an UserInfo with empty Email array", () => {
    const wrapper = mount(<UserProfileBackstageItem userInfo={getEmailEmptyArrayUserInfo()} />);
    wrapper.unmount();
  });

  it("should open SignOut modal frontstage on click", () => {
    const spyMethod = sinon.spy();
    const wrapper = mount(<UserProfileBackstageItem userInfo={mockUserInfo()} onOpenSignOut={spyMethod} />);

    wrapper.find(".nz-backstage-userProfile").simulate("click");
    spyMethod.calledOnce.should.true;

    wrapper.unmount();

    FrontstageManager.closeModalFrontstage();
  });

});
