/*---------------------------------------------------------------------------------------------
|  $Copyright: (c) 2018 Bentley Systems, Incorporated. All rights reserved. $
 *--------------------------------------------------------------------------------------------*/
import { mount, shallow } from "enzyme";
import * as React from "react";
import { BodyText } from "../../ui-core";

describe("<BodyText />", () => {
  it("should render", () => {
    mount(<BodyText />);
  });
  it("renders correctly", () => {
    shallow(<BodyText />).should.matchSnapshot();
  });

  it("content renders correctly", () => {
    shallow(<BodyText>Test content</BodyText>).should.matchSnapshot();
  });

  it("has correct className", () => {
    const wrapper = shallow(<BodyText />);
    wrapper.find(".uicore-text-block").should.exist;
  });

  it("has correct text", () => {
    const wrapper = shallow(<BodyText>Test Content</BodyText>);
    wrapper.find(".uicore-text-block").text().should.equal("Test Content");
  });
});
