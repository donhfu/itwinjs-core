/*---------------------------------------------------------------------------------------------
|  $Copyright: (c) 2018 Bentley Systems, Incorporated. All rights reserved. $
 *--------------------------------------------------------------------------------------------*/
import { mount, shallow } from "enzyme";
import * as React from "react";

import Icon from "../../../src/footer/snap-mode/Icon";

describe("<Icon />", () => {
  it("should render", () => {
    mount(<Icon />);
  });

  it("renders correctly", () => {
    shallow(<Icon />).should.matchSnapshot();
  });
});
