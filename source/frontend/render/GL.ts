/*---------------------------------------------------------------------------------------------
| $Copyright: (c) 2018 Bentley Systems, Incorporated. All rights reserved. $
 *--------------------------------------------------------------------------------------------*/

export namespace GL {
  export enum BlendEquation {
    Add = WebGLRenderingContext.FUNC_ADD,
    Subtract = WebGLRenderingContext.FUNC_SUBTRACT,
    ReverseSubtract = WebGLRenderingContext.FUNC_REVERSE_SUBTRACT,
    Default = Add,
  }

  export enum BlendFactor {
    Zero = WebGLRenderingContext.ZERO,
    One = WebGLRenderingContext.ONE,
    SrcColor = WebGLRenderingContext.SRC_COLOR,
    OneMinusSrcColor = WebGLRenderingContext.ONE_MINUS_SRC_COLOR,
    DstColor = WebGLRenderingContext.DST_COLOR,
    OneMinusDstColor = WebGLRenderingContext.ONE_MINUS_DST_COLOR,
    SrcAlpha = WebGLRenderingContext.SRC_ALPHA,
    OneMinusSrcAlpha = WebGLRenderingContext.ONE_MINUS_SRC_ALPHA,
    DstAlpha = WebGLRenderingContext.DST_ALPHA,
    OneMinusDstAlpha = WebGLRenderingContext.ONE_MINUS_DST_ALPHA,
    ConstColor = WebGLRenderingContext.CONSTANT_COLOR,
    OneMinusConstColor = WebGLRenderingContext.ONE_MINUS_CONSTANT_COLOR,
    ConstAlpha = WebGLRenderingContext.CONSTANT_ALPHA,
    OneMinusConstAlpha = WebGLRenderingContext.ONE_MINUS_CONSTANT_ALPHA,
    AlphaSaturate = WebGLRenderingContext.SRC_ALPHA_SATURATE,
    DefaultSrc = One,
    DefaultDst = Zero,
  }

  export enum Buffer {
    ArrayBuffer = WebGLRenderingContext.ARRAY_BUFFER,
    ElementArrayBuffer = WebGLRenderingContext.ELEMENT_ARRAY_BUFFER,
    // WebGL 2 has more buffer options
    ArrayBufferBinding = WebGLRenderingContext.ARRAY_BUFFER_BINDING,
    ElementArrayBufferBinding = WebGLRenderingContext.ELEMENT_ARRAY_BUFFER_BINDING,
    BufferSize = WebGLRenderingContext.BUFFER_SIZE,
    BufferUsage = WebGLRenderingContext.BUFFER_USAGE,
  }

  export enum BufferUsage {
    DynamicDraw = WebGLRenderingContext.DYNAMIC_DRAW,
    StaticDraw = WebGLRenderingContext.STATIC_DRAW,
    StreamDraw = WebGLRenderingContext.STREAM_DRAW,
  }

  /* Stenciling commented out for now since it is not used */
  // export enum StencilOperation {
  //   Keep = WebGLRenderingContext.KEEP,
  //   Zero = WebGLRenderingContext.ZERO,
  //   Replace = WebGLRenderingContext.REPLACE,
  //   Incr = WebGLRenderingContext.INCR,
  //   IncrWrap = WebGLRenderingContext.INCR_WRAP,
  //   Decr = WebGLRenderingContext.DECR,
  //   DecrWrap = WebGLRenderingContext.DECR_WRAP,
  //   Invert = WebGLRenderingContext.INVERT,
  //   Default = Keep,
  // }

  // export enum StencilFunction {
  //   Never = WebGLRenderingContext.NEVER,
  //   Less = WebGLRenderingContext.LESS,
  //   LEqual = WebGLRenderingContext.LEQUAL,
  //   Greater = WebGLRenderingContext.GREATER,
  //   GEqual = WebGLRenderingContext.GEQUAL,
  //   Equal = WebGLRenderingContext.EQUAL,
  //   NotEqual = WebGLRenderingContext.NOTEQUAL,
  //   Always = WebGLRenderingContext.ALWAYS,
  //   Default = Always,
  // }

  export enum CullFace {
    Front = WebGLRenderingContext.FRONT,
    Back = WebGLRenderingContext.BACK,
    FrontAndBack = WebGLRenderingContext.FRONT_AND_BACK,
    Default = Back,
  }

  export enum DataType {
    Byte = WebGLRenderingContext.BYTE,
    Short = WebGLRenderingContext.SHORT,
    UnsignedByte = WebGLRenderingContext.UNSIGNED_BYTE,
    UnsignedShort = WebGLRenderingContext.UNSIGNED_SHORT,
    Float = WebGLRenderingContext.FLOAT,
    // WebGL 2 has more data types
    // HalfFloat = WebGLRenderingContext.HALF_FLOAT,
  }

  export enum FrontFace {
    CounterClockwise = WebGLRenderingContext.CCW,
    Clockwise = WebGLRenderingContext.CW,
    Default = CounterClockwise,
  }

  export enum DepthFunc {
    Never = WebGLRenderingContext.NEVER,
    Less = WebGLRenderingContext.LESS,
    Equal = WebGLRenderingContext.EQUAL,
    LessOrEqual = WebGLRenderingContext.LEQUAL,
    Greater = WebGLRenderingContext.GREATER,
    NotEqual = WebGLRenderingContext.NOTEQUAL,
    GreaterOrEqual = WebGLRenderingContext.GEQUAL,
    Always = WebGLRenderingContext.ALWAYS,
    Default = Less,
  }

  export enum Capability {
    Blend = WebGLRenderingContext.BLEND,
    BlendColor = WebGLRenderingContext.BLEND_COLOR,
    BlendEquationAlpha = WebGLRenderingContext.BLEND_EQUATION_ALPHA,
    BlendEquationRGB = WebGLRenderingContext.BLEND_EQUATION_RGB,
    BlendSrcAlpha = WebGLRenderingContext.BLEND_SRC_ALPHA,
    BlendSrcRgb = WebGLRenderingContext.BLEND_SRC_RGB,
    BlendDstAlpha = WebGLRenderingContext.BLEND_DST_ALPHA,
    BlendDstRgb = WebGLRenderingContext.BLEND_DST_RGB,
    CullFace = WebGLRenderingContext.CULL_FACE,
    CullFaceMode = WebGLRenderingContext.CULL_FACE_MODE,
    DepthFunc = WebGLRenderingContext.DEPTH_FUNC,
    DepthTest = WebGLRenderingContext.DEPTH_TEST,
    DepthWriteMask = WebGLRenderingContext.DEPTH_WRITEMASK,
    FrontFace = WebGLRenderingContext.FRONT_FACE,
    /* Stenciling commented out for now since it is not used */
    // StencilFrontFunc = WebGLRenderingContext.STENCIL_FUNC,
    // StencilFrontRef = WebGLRenderingContext.STENCIL_REF,
    // StencilFrontValueMask = WebGLRenderingContext.STENCIL_VALUE_MASK,
    // StencilFrontWriteMask = WebGLRenderingContext.STENCIL_WRITEMASK,
    // StencilFrontOpFail = WebGLRenderingContext.STENCIL_FAIL,
    // StencilFrontOpZFail = WebGLRenderingContext.STENCIL_PASS_DEPTH_FAIL,
    // StencilFrontOpZPass = WebGLRenderingContext.STENCIL_PASS_DEPTH_PASS,
    // StencilBackFunc = WebGLRenderingContext.STENCIL_BACK_FUNC,
    // StencilBackRef = WebGLRenderingContext.STENCIL_BACK_REF,
    // StencilBackValueMask = WebGLRenderingContext.STENCIL_BACK_VALUE_MASK,
    // StencilBackWriteMask = WebGLRenderingContext.STENCIL_BACK_WRITEMASK,
    // StencilBackOpFail = WebGLRenderingContext.STENCIL_BACK_FAIL,
    // StencilBackOpZFail = WebGLRenderingContext.STENCIL_BACK_PASS_DEPTH_FAIL,
    // StencilBackOpZPass = WebGLRenderingContext.STENCIL_BACK_PASS_DEPTH_PASS,
    StencilTest = WebGLRenderingContext.STENCIL_TEST,
    StencilWriteMask = WebGLRenderingContext.STENCIL_WRITEMASK,
  }

  export enum WrapMode {
    Repeat = WebGLRenderingContext.REPEAT,
    MirroredRepeat = WebGLRenderingContext.MIRRORED_REPEAT,
    ClampToEdge = WebGLRenderingContext.CLAMP_TO_EDGE,
  }

  export enum TextureInternalFormat {
    Rgb = WebGLRenderingContext.RGB,
    Rgba = WebGLRenderingContext.RGBA,
    DepthStencil = WebGLRenderingContext.DEPTH_STENCIL,
    Luminance = WebGLRenderingContext.LUMINANCE,
    DepthComponent = WebGLRenderingContext.DEPTH_COMPONENT,
  }

  export enum TextureFormat {
    Rgb = WebGLRenderingContext.RGB,
    Rgba = WebGLRenderingContext.RGBA,
    DepthStencil = WebGLRenderingContext.DEPTH_STENCIL,
    Luminance = WebGLRenderingContext.LUMINANCE,
    DepthComponent = WebGLRenderingContext.DEPTH_COMPONENT,
  }

  export enum TextureDataType {
    Float = WebGLRenderingContext.FLOAT,
    UnsignedByte = WebGLRenderingContext.UNSIGNED_BYTE,
//    UnsignedInt24_8 = WebGLRenderingContext.UNSIGNED_INT_24_8,
    UnsignedInt = WebGLRenderingContext.UNSIGNED_INT,
    }
}
