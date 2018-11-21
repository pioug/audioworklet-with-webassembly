var libvasynthaw = function(libvasynthaw) {
  libvasynthaw = libvasynthaw || {};

// The Module object: Our interface to the outside world. We import
// and export values on it. There are various ways Module can be used:
// 1. Not defined. We create it here
// 2. A function parameter, function(Module) { ..generated code.. }
// 3. pre-run appended it, var Module = {}; ..generated code..
// 4. External script tag defines var Module.
// We need to check if Module already exists (e.g. case 3 above).
// Substitution will be replaced with actual code on later stage of the build,
// this way Closure Compiler will not mangle it (e.g. case 4. above).
// Note that if you want to run closure, and also to use Module
// after the generated code, you will need to define   var Module = {};
// before the code. Then that object will be used in the code, and you
// can continue to use Module afterwards as well.
var Module = typeof libvasynthaw !== 'undefined' ? libvasynthaw : {};

// --pre-jses are emitted after the Module integration code, so that they can
// refer to Module (if they choose; they can also define Module)


// Sometimes an existing Module object exists with properties
// meant to overwrite the default module functionality. Here
// we collect those properties and reapply _after_ we configure
// the current environment's defaults to avoid having to be so
// defensive during initialization.
var moduleOverrides = {};
var key;
for (key in Module) {
  if (Module.hasOwnProperty(key)) {
    moduleOverrides[key] = Module[key];
  }
}

Module['arguments'] = [];
Module['thisProgram'] = './this.program';
Module['quit'] = function(status, toThrow) {
  throw toThrow;
};
Module['preRun'] = [];
Module['postRun'] = [];

// The environment setup code below is customized to use Module.
// *** Environment setup code ***

var ENVIRONMENT_IS_WEB = false;
var ENVIRONMENT_IS_WORKER = false;
var ENVIRONMENT_IS_NODE = false;
var ENVIRONMENT_IS_SHELL = false;
ENVIRONMENT_IS_WEB = typeof window === 'object';
ENVIRONMENT_IS_WORKER = typeof importScripts === 'function';
ENVIRONMENT_IS_NODE = typeof process === 'object' && typeof require === 'function' && !ENVIRONMENT_IS_WEB && !ENVIRONMENT_IS_WORKER;
ENVIRONMENT_IS_SHELL = !ENVIRONMENT_IS_WEB && !ENVIRONMENT_IS_NODE && !ENVIRONMENT_IS_WORKER;


// Three configurations we can be running in:
// 1) We could be the application main() thread running in the main JS UI thread. (ENVIRONMENT_IS_WORKER == false and ENVIRONMENT_IS_PTHREAD == false)
// 2) We could be the application main() thread proxied to worker. (with Emscripten -s PROXY_TO_WORKER=1) (ENVIRONMENT_IS_WORKER == true, ENVIRONMENT_IS_PTHREAD == false)
// 3) We could be an application pthread running in a worker. (ENVIRONMENT_IS_WORKER == true and ENVIRONMENT_IS_PTHREAD == true)

if (ENVIRONMENT_IS_NODE) {


  // Expose functionality in the same simple way that the shells work
  // Note that we pollute the global namespace here, otherwise we break in node
  var nodeFS;
  var nodePath;

  Module['read'] = function shell_read(filename, binary) {
    var ret;
    ret = tryParseAsDataURI(filename);
    if (!ret) {
      if (!nodeFS) nodeFS = require('fs');
      if (!nodePath) nodePath = require('path');
      filename = nodePath['normalize'](filename);
      ret = nodeFS['readFileSync'](filename);
    }
    return binary ? ret : ret.toString();
  };

  Module['readBinary'] = function readBinary(filename) {
    var ret = Module['read'](filename, true);
    if (!ret.buffer) {
      ret = new Uint8Array(ret);
    }
    assert(ret.buffer);
    return ret;
  };

  if (process['argv'].length > 1) {
    Module['thisProgram'] = process['argv'][1].replace(/\\/g, '/');
  }

  Module['arguments'] = process['argv'].slice(2);

  // MODULARIZE will export the module in the proper place outside, we don't need to export here

  process['on']('uncaughtException', function(ex) {
    // suppress ExitStatus exceptions from showing an error
    if (!(ex instanceof ExitStatus)) {
      throw ex;
    }
  });
  // Currently node will swallow unhandled rejections, but this behavior is
  // deprecated, and in the future it will exit with error status.
  process['on']('unhandledRejection', function(reason, p) {
    process['exit'](1);
  });

  Module['quit'] = function(status) {
    process['exit'](status);
  };

  Module['inspect'] = function () { return '[Emscripten Module object]'; };
} else
if (ENVIRONMENT_IS_SHELL) {


  if (typeof read != 'undefined') {
    Module['read'] = function shell_read(f) {
      var data = tryParseAsDataURI(f);
      if (data) {
        return intArrayToString(data);
      }
      return read(f);
    };
  }

  Module['readBinary'] = function readBinary(f) {
    var data;
    data = tryParseAsDataURI(f);
    if (data) {
      return data;
    }
    if (typeof readbuffer === 'function') {
      return new Uint8Array(readbuffer(f));
    }
    data = read(f, 'binary');
    assert(typeof data === 'object');
    return data;
  };

  if (typeof scriptArgs != 'undefined') {
    Module['arguments'] = scriptArgs;
  } else if (typeof arguments != 'undefined') {
    Module['arguments'] = arguments;
  }

  if (typeof quit === 'function') {
    Module['quit'] = function(status) {
      quit(status);
    }
  }
} else
if (ENVIRONMENT_IS_WEB || ENVIRONMENT_IS_WORKER) {


  Module['read'] = function shell_read(url) {
    try {
      var xhr = new XMLHttpRequest();
      xhr.open('GET', url, false);
      xhr.send(null);
      return xhr.responseText;
    } catch (err) {
      var data = tryParseAsDataURI(url);
      if (data) {
        return intArrayToString(data);
      }
      throw err;
    }
  };

  if (ENVIRONMENT_IS_WORKER) {
    Module['readBinary'] = function readBinary(url) {
      try {
        var xhr = new XMLHttpRequest();
        xhr.open('GET', url, false);
        xhr.responseType = 'arraybuffer';
        xhr.send(null);
        return new Uint8Array(xhr.response);
      } catch (err) {
        var data = tryParseAsDataURI(url);
        if (data) {
          return data;
        }
        throw err;
      }
    };
  }

  Module['readAsync'] = function readAsync(url, onload, onerror) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.responseType = 'arraybuffer';
    xhr.onload = function xhr_onload() {
      if (xhr.status == 200 || (xhr.status == 0 && xhr.response)) { // file URLs can return 0
        onload(xhr.response);
        return;
      }
      var data = tryParseAsDataURI(url);
      if (data) {
        onload(data.buffer);
        return;
      }
      onerror();
    };
    xhr.onerror = onerror;
    xhr.send(null);
  };

  Module['setWindowTitle'] = function(title) { document.title = title };
} else
{
}

// Set up the out() and err() hooks, which are how we can print to stdout or
// stderr, respectively.
// If the user provided Module.print or printErr, use that. Otherwise,
// console.log is checked first, as 'print' on the web will open a print dialogue
// printErr is preferable to console.warn (works better in shells)
// bind(console) is necessary to fix IE/Edge closed dev tools panel behavior.
var out = Module['print'] || (typeof console !== 'undefined' ? console.log.bind(console) : (typeof print !== 'undefined' ? print : null));
var err = Module['printErr'] || (typeof printErr !== 'undefined' ? printErr : ((typeof console !== 'undefined' && console.warn.bind(console)) || out));

// *** Environment setup code ***

// Merge back in the overrides
for (key in moduleOverrides) {
  if (moduleOverrides.hasOwnProperty(key)) {
    Module[key] = moduleOverrides[key];
  }
}
// Free the object hierarchy contained in the overrides, this lets the GC
// reclaim data used e.g. in memoryInitializerRequest, which is a large typed array.
moduleOverrides = undefined;



// {{PREAMBLE_ADDITIONS}}

var STACK_ALIGN = 16;


function staticAlloc(size) {
  var ret = STATICTOP;
  STATICTOP = (STATICTOP + size + 15) & -16;
  return ret;
}

function dynamicAlloc(size) {
  var ret = HEAP32[DYNAMICTOP_PTR>>2];
  var end = (ret + size + 15) & -16;
  HEAP32[DYNAMICTOP_PTR>>2] = end;
  if (end >= TOTAL_MEMORY) {
    var success = enlargeMemory();
    if (!success) {
      HEAP32[DYNAMICTOP_PTR>>2] = ret;
      return 0;
    }
  }
  return ret;
}

function alignMemory(size, factor) {
  if (!factor) factor = STACK_ALIGN; // stack alignment (16-byte) by default
  var ret = size = Math.ceil(size / factor) * factor;
  return ret;
}

function getNativeTypeSize(type) {
  switch (type) {
    case 'i1': case 'i8': return 1;
    case 'i16': return 2;
    case 'i32': return 4;
    case 'i64': return 8;
    case 'float': return 4;
    case 'double': return 8;
    default: {
      if (type[type.length-1] === '*') {
        return 4; // A pointer
      } else if (type[0] === 'i') {
        var bits = parseInt(type.substr(1));
        assert(bits % 8 === 0);
        return bits / 8;
      } else {
        return 0;
      }
    }
  }
}

function warnOnce(text) {
  if (!warnOnce.shown) warnOnce.shown = {};
  if (!warnOnce.shown[text]) {
    warnOnce.shown[text] = 1;
    err(text);
  }
}

var asm2wasmImports = { // special asm2wasm imports
    "f64-rem": function(x, y) {
        return x % y;
    },
    "debugger": function() {
        debugger;
    }
};



var jsCallStartIndex = 1;
var functionPointers = new Array(0);

// 'sig' parameter is only used on LLVM wasm backend
function addFunction(func, sig) {
  var base = 0;
  for (var i = base; i < base + 0; i++) {
    if (!functionPointers[i]) {
      functionPointers[i] = func;
      return jsCallStartIndex + i;
    }
  }
  throw 'Finished up all reserved function pointers. Use a higher value for RESERVED_FUNCTION_POINTERS.';
}

function removeFunction(index) {
  functionPointers[index-jsCallStartIndex] = null;
}

var funcWrappers = {};

function getFuncWrapper(func, sig) {
  if (!func) return; // on null pointer, return undefined
  assert(sig);
  if (!funcWrappers[sig]) {
    funcWrappers[sig] = {};
  }
  var sigCache = funcWrappers[sig];
  if (!sigCache[func]) {
    // optimize away arguments usage in common cases
    if (sig.length === 1) {
      sigCache[func] = function dynCall_wrapper() {
        return dynCall(sig, func);
      };
    } else if (sig.length === 2) {
      sigCache[func] = function dynCall_wrapper(arg) {
        return dynCall(sig, func, [arg]);
      };
    } else {
      // general case
      sigCache[func] = function dynCall_wrapper() {
        return dynCall(sig, func, Array.prototype.slice.call(arguments));
      };
    }
  }
  return sigCache[func];
}


function makeBigInt(low, high, unsigned) {
  return unsigned ? ((+((low>>>0)))+((+((high>>>0)))*4294967296.0)) : ((+((low>>>0)))+((+((high|0)))*4294967296.0));
}

function dynCall(sig, ptr, args) {
  if (args && args.length) {
    return Module['dynCall_' + sig].apply(null, [ptr].concat(args));
  } else {
    return Module['dynCall_' + sig].call(null, ptr);
  }
}



var Runtime = {
  // FIXME backwards compatibility layer for ports. Support some Runtime.*
  //       for now, fix it there, then remove it from here. That way we
  //       can minimize any period of breakage.
  dynCall: dynCall, // for SDL2 port
};

// The address globals begin at. Very low in memory, for code size and optimization opportunities.
// Above 0 is static memory, starting with globals.
// Then the stack.
// Then 'dynamic' memory for sbrk.
var GLOBAL_BASE = 1024;


// === Preamble library stuff ===

// Documentation for the public APIs defined in this file must be updated in:
//    site/source/docs/api_reference/preamble.js.rst
// A prebuilt local version of the documentation is available at:
//    site/build/text/docs/api_reference/preamble.js.txt
// You can also build docs locally as HTML or other formats in site/
// An online HTML version (which may be of a different version of Emscripten)
//    is up at http://kripken.github.io/emscripten-site/docs/api_reference/preamble.js.html



//========================================
// Runtime essentials
//========================================

var ABORT = 0; // whether we are quitting the application. no code should run after this. set in exit() and abort()
var EXITSTATUS = 0;

/** @type {function(*, string=)} */
function assert(condition, text) {
  if (!condition) {
    abort('Assertion failed: ' + text);
  }
}

var globalScope = this;

// Returns the C function with a specified identifier (for C++, you need to do manual name mangling)
function getCFunc(ident) {
  var func = Module['_' + ident]; // closure exported function
  assert(func, 'Cannot call unknown function ' + ident + ', make sure it is exported');
  return func;
}

var JSfuncs = {
  // Helpers for cwrap -- it can't refer to Runtime directly because it might
  // be renamed by closure, instead it calls JSfuncs['stackSave'].body to find
  // out what the minified function name is.
  'stackSave': function() {
    stackSave()
  },
  'stackRestore': function() {
    stackRestore()
  },
  // type conversion from js to c
  'arrayToC' : function(arr) {
    var ret = stackAlloc(arr.length);
    writeArrayToMemory(arr, ret);
    return ret;
  },
  'stringToC' : function(str) {
    var ret = 0;
    if (str !== null && str !== undefined && str !== 0) { // null string
      // at most 4 bytes per UTF-8 code point, +1 for the trailing '\0'
      var len = (str.length << 2) + 1;
      ret = stackAlloc(len);
      stringToUTF8(str, ret, len);
    }
    return ret;
  }
};

// For fast lookup of conversion functions
var toC = {
  'string': JSfuncs['stringToC'], 'array': JSfuncs['arrayToC']
};


// C calling interface.
function ccall(ident, returnType, argTypes, args, opts) {
  function convertReturnValue(ret) {
    if (returnType === 'string') return Pointer_stringify(ret);
    if (returnType === 'boolean') return Boolean(ret);
    return ret;
  }

  var func = getCFunc(ident);
  var cArgs = [];
  var stack = 0;
  if (args) {
    for (var i = 0; i < args.length; i++) {
      var converter = toC[argTypes[i]];
      if (converter) {
        if (stack === 0) stack = stackSave();
        cArgs[i] = converter(args[i]);
      } else {
        cArgs[i] = args[i];
      }
    }
  }
  var ret = func.apply(null, cArgs);
  ret = convertReturnValue(ret);
  if (stack !== 0) stackRestore(stack);
  return ret;
}

function cwrap(ident, returnType, argTypes, opts) {
  argTypes = argTypes || [];
  // When the function takes numbers and returns a number, we can just return
  // the original function
  var numericArgs = argTypes.every(function(type){ return type === 'number'});
  var numericRet = returnType !== 'string';
  if (numericRet && numericArgs && !opts) {
    return getCFunc(ident);
  }
  return function() {
    return ccall(ident, returnType, argTypes, arguments, opts);
  }
}

/** @type {function(number, number, string, boolean=)} */
function setValue(ptr, value, type, noSafe) {
  type = type || 'i8';
  if (type.charAt(type.length-1) === '*') type = 'i32'; // pointers are 32-bit
    switch(type) {
      case 'i1': HEAP8[((ptr)>>0)]=value; break;
      case 'i8': HEAP8[((ptr)>>0)]=value; break;
      case 'i16': HEAP16[((ptr)>>1)]=value; break;
      case 'i32': HEAP32[((ptr)>>2)]=value; break;
      case 'i64': (tempI64 = [value>>>0,(tempDouble=value,(+(Math_abs(tempDouble))) >= 1.0 ? (tempDouble > 0.0 ? ((Math_min((+(Math_floor((tempDouble)/4294967296.0))), 4294967295.0))|0)>>>0 : (~~((+(Math_ceil((tempDouble - +(((~~(tempDouble)))>>>0))/4294967296.0)))))>>>0) : 0)],HEAP32[((ptr)>>2)]=tempI64[0],HEAP32[(((ptr)+(4))>>2)]=tempI64[1]); break;
      case 'float': HEAPF32[((ptr)>>2)]=value; break;
      case 'double': HEAPF64[((ptr)>>3)]=value; break;
      default: abort('invalid type for setValue: ' + type);
    }
}

/** @type {function(number, string, boolean=)} */
function getValue(ptr, type, noSafe) {
  type = type || 'i8';
  if (type.charAt(type.length-1) === '*') type = 'i32'; // pointers are 32-bit
    switch(type) {
      case 'i1': return HEAP8[((ptr)>>0)];
      case 'i8': return HEAP8[((ptr)>>0)];
      case 'i16': return HEAP16[((ptr)>>1)];
      case 'i32': return HEAP32[((ptr)>>2)];
      case 'i64': return HEAP32[((ptr)>>2)];
      case 'float': return HEAPF32[((ptr)>>2)];
      case 'double': return HEAPF64[((ptr)>>3)];
      default: abort('invalid type for getValue: ' + type);
    }
  return null;
}

var ALLOC_NORMAL = 0; // Tries to use _malloc()
var ALLOC_STACK = 1; // Lives for the duration of the current function call
var ALLOC_STATIC = 2; // Cannot be freed
var ALLOC_DYNAMIC = 3; // Cannot be freed except through sbrk
var ALLOC_NONE = 4; // Do not allocate

// allocate(): This is for internal use. You can use it yourself as well, but the interface
//             is a little tricky (see docs right below). The reason is that it is optimized
//             for multiple syntaxes to save space in generated code. So you should
//             normally not use allocate(), and instead allocate memory using _malloc(),
//             initialize it with setValue(), and so forth.
// @slab: An array of data, or a number. If a number, then the size of the block to allocate,
//        in *bytes* (note that this is sometimes confusing: the next parameter does not
//        affect this!)
// @types: Either an array of types, one for each byte (or 0 if no type at that position),
//         or a single type which is used for the entire block. This only matters if there
//         is initial data - if @slab is a number, then this does not matter at all and is
//         ignored.
// @allocator: How to allocate memory, see ALLOC_*
/** @type {function((TypedArray|Array<number>|number), string, number, number=)} */
function allocate(slab, types, allocator, ptr) {
  var zeroinit, size;
  if (typeof slab === 'number') {
    zeroinit = true;
    size = slab;
  } else {
    zeroinit = false;
    size = slab.length;
  }

  var singleType = typeof types === 'string' ? types : null;

  var ret;
  if (allocator == ALLOC_NONE) {
    ret = ptr;
  } else {
    ret = [typeof _malloc === 'function' ? _malloc : staticAlloc, stackAlloc, staticAlloc, dynamicAlloc][allocator === undefined ? ALLOC_STATIC : allocator](Math.max(size, singleType ? 1 : types.length));
  }

  if (zeroinit) {
    var stop;
    ptr = ret;
    assert((ret & 3) == 0);
    stop = ret + (size & ~3);
    for (; ptr < stop; ptr += 4) {
      HEAP32[((ptr)>>2)]=0;
    }
    stop = ret + size;
    while (ptr < stop) {
      HEAP8[((ptr++)>>0)]=0;
    }
    return ret;
  }

  if (singleType === 'i8') {
    if (slab.subarray || slab.slice) {
      HEAPU8.set(/** @type {!Uint8Array} */ (slab), ret);
    } else {
      HEAPU8.set(new Uint8Array(slab), ret);
    }
    return ret;
  }

  var i = 0, type, typeSize, previousType;
  while (i < size) {
    var curr = slab[i];

    type = singleType || types[i];
    if (type === 0) {
      i++;
      continue;
    }

    if (type == 'i64') type = 'i32'; // special case: we have one i32 here, and one i32 later

    setValue(ret+i, curr, type);

    // no need to look up size unless type changes, so cache it
    if (previousType !== type) {
      typeSize = getNativeTypeSize(type);
      previousType = type;
    }
    i += typeSize;
  }

  return ret;
}

// Allocate memory during any stage of startup - static memory early on, dynamic memory later, malloc when ready
function getMemory(size) {
  if (!staticSealed) return staticAlloc(size);
  if (!runtimeInitialized) return dynamicAlloc(size);
  return _malloc(size);
}

/** @type {function(number, number=)} */
function Pointer_stringify(ptr, length) {
  if (length === 0 || !ptr) return '';
  // Find the length, and check for UTF while doing so
  var hasUtf = 0;
  var t;
  var i = 0;
  while (1) {
    t = HEAPU8[(((ptr)+(i))>>0)];
    hasUtf |= t;
    if (t == 0 && !length) break;
    i++;
    if (length && i == length) break;
  }
  if (!length) length = i;

  var ret = '';

  if (hasUtf < 128) {
    var MAX_CHUNK = 1024; // split up into chunks, because .apply on a huge string can overflow the stack
    var curr;
    while (length > 0) {
      curr = String.fromCharCode.apply(String, HEAPU8.subarray(ptr, ptr + Math.min(length, MAX_CHUNK)));
      ret = ret ? ret + curr : curr;
      ptr += MAX_CHUNK;
      length -= MAX_CHUNK;
    }
    return ret;
  }
  return UTF8ToString(ptr);
}

// Given a pointer 'ptr' to a null-terminated ASCII-encoded string in the emscripten HEAP, returns
// a copy of that string as a Javascript String object.

function AsciiToString(ptr) {
  var str = '';
  while (1) {
    var ch = HEAP8[((ptr++)>>0)];
    if (!ch) return str;
    str += String.fromCharCode(ch);
  }
}

// Copies the given Javascript String object 'str' to the emscripten HEAP at address 'outPtr',
// null-terminated and encoded in ASCII form. The copy will require at most str.length+1 bytes of space in the HEAP.

function stringToAscii(str, outPtr) {
  return writeAsciiToMemory(str, outPtr, false);
}

// Given a pointer 'ptr' to a null-terminated UTF8-encoded string in the given array that contains uint8 values, returns
// a copy of that string as a Javascript String object.

var UTF8Decoder = typeof TextDecoder !== 'undefined' ? new TextDecoder('utf8') : undefined;
function UTF8ArrayToString(u8Array, idx) {
  var endPtr = idx;
  // TextDecoder needs to know the byte length in advance, it doesn't stop on null terminator by itself.
  // Also, use the length info to avoid running tiny strings through TextDecoder, since .subarray() allocates garbage.
  while (u8Array[endPtr]) ++endPtr;

  if (endPtr - idx > 16 && u8Array.subarray && UTF8Decoder) {
    return UTF8Decoder.decode(u8Array.subarray(idx, endPtr));
  } else {
    var u0, u1, u2, u3, u4, u5;

    var str = '';
    while (1) {
      // For UTF8 byte structure, see http://en.wikipedia.org/wiki/UTF-8#Description and https://www.ietf.org/rfc/rfc2279.txt and https://tools.ietf.org/html/rfc3629
      u0 = u8Array[idx++];
      if (!u0) return str;
      if (!(u0 & 0x80)) { str += String.fromCharCode(u0); continue; }
      u1 = u8Array[idx++] & 63;
      if ((u0 & 0xE0) == 0xC0) { str += String.fromCharCode(((u0 & 31) << 6) | u1); continue; }
      u2 = u8Array[idx++] & 63;
      if ((u0 & 0xF0) == 0xE0) {
        u0 = ((u0 & 15) << 12) | (u1 << 6) | u2;
      } else {
        u3 = u8Array[idx++] & 63;
        if ((u0 & 0xF8) == 0xF0) {
          u0 = ((u0 & 7) << 18) | (u1 << 12) | (u2 << 6) | u3;
        } else {
          u4 = u8Array[idx++] & 63;
          if ((u0 & 0xFC) == 0xF8) {
            u0 = ((u0 & 3) << 24) | (u1 << 18) | (u2 << 12) | (u3 << 6) | u4;
          } else {
            u5 = u8Array[idx++] & 63;
            u0 = ((u0 & 1) << 30) | (u1 << 24) | (u2 << 18) | (u3 << 12) | (u4 << 6) | u5;
          }
        }
      }
      if (u0 < 0x10000) {
        str += String.fromCharCode(u0);
      } else {
        var ch = u0 - 0x10000;
        str += String.fromCharCode(0xD800 | (ch >> 10), 0xDC00 | (ch & 0x3FF));
      }
    }
  }
}

// Given a pointer 'ptr' to a null-terminated UTF8-encoded string in the emscripten HEAP, returns
// a copy of that string as a Javascript String object.

function UTF8ToString(ptr) {
  return UTF8ArrayToString(HEAPU8,ptr);
}

// Copies the given Javascript String object 'str' to the given byte array at address 'outIdx',
// encoded in UTF8 form and null-terminated. The copy will require at most str.length*4+1 bytes of space in the HEAP.
// Use the function lengthBytesUTF8 to compute the exact number of bytes (excluding null terminator) that this function will write.
// Parameters:
//   str: the Javascript string to copy.
//   outU8Array: the array to copy to. Each index in this array is assumed to be one 8-byte element.
//   outIdx: The starting offset in the array to begin the copying.
//   maxBytesToWrite: The maximum number of bytes this function can write to the array. This count should include the null
//                    terminator, i.e. if maxBytesToWrite=1, only the null terminator will be written and nothing else.
//                    maxBytesToWrite=0 does not write any bytes to the output, not even the null terminator.
// Returns the number of bytes written, EXCLUDING the null terminator.

function stringToUTF8Array(str, outU8Array, outIdx, maxBytesToWrite) {
  if (!(maxBytesToWrite > 0)) // Parameter maxBytesToWrite is not optional. Negative values, 0, null, undefined and false each don't write out any bytes.
    return 0;

  var startIdx = outIdx;
  var endIdx = outIdx + maxBytesToWrite - 1; // -1 for string null terminator.
  for (var i = 0; i < str.length; ++i) {
    // Gotcha: charCodeAt returns a 16-bit word that is a UTF-16 encoded code unit, not a Unicode code point of the character! So decode UTF16->UTF32->UTF8.
    // See http://unicode.org/faq/utf_bom.html#utf16-3
    // For UTF8 byte structure, see http://en.wikipedia.org/wiki/UTF-8#Description and https://www.ietf.org/rfc/rfc2279.txt and https://tools.ietf.org/html/rfc3629
    var u = str.charCodeAt(i); // possibly a lead surrogate
    if (u >= 0xD800 && u <= 0xDFFF) u = 0x10000 + ((u & 0x3FF) << 10) | (str.charCodeAt(++i) & 0x3FF);
    if (u <= 0x7F) {
      if (outIdx >= endIdx) break;
      outU8Array[outIdx++] = u;
    } else if (u <= 0x7FF) {
      if (outIdx + 1 >= endIdx) break;
      outU8Array[outIdx++] = 0xC0 | (u >> 6);
      outU8Array[outIdx++] = 0x80 | (u & 63);
    } else if (u <= 0xFFFF) {
      if (outIdx + 2 >= endIdx) break;
      outU8Array[outIdx++] = 0xE0 | (u >> 12);
      outU8Array[outIdx++] = 0x80 | ((u >> 6) & 63);
      outU8Array[outIdx++] = 0x80 | (u & 63);
    } else if (u <= 0x1FFFFF) {
      if (outIdx + 3 >= endIdx) break;
      outU8Array[outIdx++] = 0xF0 | (u >> 18);
      outU8Array[outIdx++] = 0x80 | ((u >> 12) & 63);
      outU8Array[outIdx++] = 0x80 | ((u >> 6) & 63);
      outU8Array[outIdx++] = 0x80 | (u & 63);
    } else if (u <= 0x3FFFFFF) {
      if (outIdx + 4 >= endIdx) break;
      outU8Array[outIdx++] = 0xF8 | (u >> 24);
      outU8Array[outIdx++] = 0x80 | ((u >> 18) & 63);
      outU8Array[outIdx++] = 0x80 | ((u >> 12) & 63);
      outU8Array[outIdx++] = 0x80 | ((u >> 6) & 63);
      outU8Array[outIdx++] = 0x80 | (u & 63);
    } else {
      if (outIdx + 5 >= endIdx) break;
      outU8Array[outIdx++] = 0xFC | (u >> 30);
      outU8Array[outIdx++] = 0x80 | ((u >> 24) & 63);
      outU8Array[outIdx++] = 0x80 | ((u >> 18) & 63);
      outU8Array[outIdx++] = 0x80 | ((u >> 12) & 63);
      outU8Array[outIdx++] = 0x80 | ((u >> 6) & 63);
      outU8Array[outIdx++] = 0x80 | (u & 63);
    }
  }
  // Null-terminate the pointer to the buffer.
  outU8Array[outIdx] = 0;
  return outIdx - startIdx;
}

// Copies the given Javascript String object 'str' to the emscripten HEAP at address 'outPtr',
// null-terminated and encoded in UTF8 form. The copy will require at most str.length*4+1 bytes of space in the HEAP.
// Use the function lengthBytesUTF8 to compute the exact number of bytes (excluding null terminator) that this function will write.
// Returns the number of bytes written, EXCLUDING the null terminator.

function stringToUTF8(str, outPtr, maxBytesToWrite) {
  return stringToUTF8Array(str, HEAPU8,outPtr, maxBytesToWrite);
}

// Returns the number of bytes the given Javascript string takes if encoded as a UTF8 byte array, EXCLUDING the null terminator byte.

function lengthBytesUTF8(str) {
  var len = 0;
  for (var i = 0; i < str.length; ++i) {
    // Gotcha: charCodeAt returns a 16-bit word that is a UTF-16 encoded code unit, not a Unicode code point of the character! So decode UTF16->UTF32->UTF8.
    // See http://unicode.org/faq/utf_bom.html#utf16-3
    var u = str.charCodeAt(i); // possibly a lead surrogate
    if (u >= 0xD800 && u <= 0xDFFF) u = 0x10000 + ((u & 0x3FF) << 10) | (str.charCodeAt(++i) & 0x3FF);
    if (u <= 0x7F) {
      ++len;
    } else if (u <= 0x7FF) {
      len += 2;
    } else if (u <= 0xFFFF) {
      len += 3;
    } else if (u <= 0x1FFFFF) {
      len += 4;
    } else if (u <= 0x3FFFFFF) {
      len += 5;
    } else {
      len += 6;
    }
  }
  return len;
}

// Given a pointer 'ptr' to a null-terminated UTF16LE-encoded string in the emscripten HEAP, returns
// a copy of that string as a Javascript String object.

var UTF16Decoder = typeof TextDecoder !== 'undefined' ? new TextDecoder('utf-16le') : undefined;
function UTF16ToString(ptr) {
  var endPtr = ptr;
  // TextDecoder needs to know the byte length in advance, it doesn't stop on null terminator by itself.
  // Also, use the length info to avoid running tiny strings through TextDecoder, since .subarray() allocates garbage.
  var idx = endPtr >> 1;
  while (HEAP16[idx]) ++idx;
  endPtr = idx << 1;

  if (endPtr - ptr > 32 && UTF16Decoder) {
    return UTF16Decoder.decode(HEAPU8.subarray(ptr, endPtr));
  } else {
    var i = 0;

    var str = '';
    while (1) {
      var codeUnit = HEAP16[(((ptr)+(i*2))>>1)];
      if (codeUnit == 0) return str;
      ++i;
      // fromCharCode constructs a character from a UTF-16 code unit, so we can pass the UTF16 string right through.
      str += String.fromCharCode(codeUnit);
    }
  }
}

// Copies the given Javascript String object 'str' to the emscripten HEAP at address 'outPtr',
// null-terminated and encoded in UTF16 form. The copy will require at most str.length*4+2 bytes of space in the HEAP.
// Use the function lengthBytesUTF16() to compute the exact number of bytes (excluding null terminator) that this function will write.
// Parameters:
//   str: the Javascript string to copy.
//   outPtr: Byte address in Emscripten HEAP where to write the string to.
//   maxBytesToWrite: The maximum number of bytes this function can write to the array. This count should include the null
//                    terminator, i.e. if maxBytesToWrite=2, only the null terminator will be written and nothing else.
//                    maxBytesToWrite<2 does not write any bytes to the output, not even the null terminator.
// Returns the number of bytes written, EXCLUDING the null terminator.

function stringToUTF16(str, outPtr, maxBytesToWrite) {
  // Backwards compatibility: if max bytes is not specified, assume unsafe unbounded write is allowed.
  if (maxBytesToWrite === undefined) {
    maxBytesToWrite = 0x7FFFFFFF;
  }
  if (maxBytesToWrite < 2) return 0;
  maxBytesToWrite -= 2; // Null terminator.
  var startPtr = outPtr;
  var numCharsToWrite = (maxBytesToWrite < str.length*2) ? (maxBytesToWrite / 2) : str.length;
  for (var i = 0; i < numCharsToWrite; ++i) {
    // charCodeAt returns a UTF-16 encoded code unit, so it can be directly written to the HEAP.
    var codeUnit = str.charCodeAt(i); // possibly a lead surrogate
    HEAP16[((outPtr)>>1)]=codeUnit;
    outPtr += 2;
  }
  // Null-terminate the pointer to the HEAP.
  HEAP16[((outPtr)>>1)]=0;
  return outPtr - startPtr;
}

// Returns the number of bytes the given Javascript string takes if encoded as a UTF16 byte array, EXCLUDING the null terminator byte.

function lengthBytesUTF16(str) {
  return str.length*2;
}

function UTF32ToString(ptr) {
  var i = 0;

  var str = '';
  while (1) {
    var utf32 = HEAP32[(((ptr)+(i*4))>>2)];
    if (utf32 == 0)
      return str;
    ++i;
    // Gotcha: fromCharCode constructs a character from a UTF-16 encoded code (pair), not from a Unicode code point! So encode the code point to UTF-16 for constructing.
    // See http://unicode.org/faq/utf_bom.html#utf16-3
    if (utf32 >= 0x10000) {
      var ch = utf32 - 0x10000;
      str += String.fromCharCode(0xD800 | (ch >> 10), 0xDC00 | (ch & 0x3FF));
    } else {
      str += String.fromCharCode(utf32);
    }
  }
}

// Copies the given Javascript String object 'str' to the emscripten HEAP at address 'outPtr',
// null-terminated and encoded in UTF32 form. The copy will require at most str.length*4+4 bytes of space in the HEAP.
// Use the function lengthBytesUTF32() to compute the exact number of bytes (excluding null terminator) that this function will write.
// Parameters:
//   str: the Javascript string to copy.
//   outPtr: Byte address in Emscripten HEAP where to write the string to.
//   maxBytesToWrite: The maximum number of bytes this function can write to the array. This count should include the null
//                    terminator, i.e. if maxBytesToWrite=4, only the null terminator will be written and nothing else.
//                    maxBytesToWrite<4 does not write any bytes to the output, not even the null terminator.
// Returns the number of bytes written, EXCLUDING the null terminator.

function stringToUTF32(str, outPtr, maxBytesToWrite) {
  // Backwards compatibility: if max bytes is not specified, assume unsafe unbounded write is allowed.
  if (maxBytesToWrite === undefined) {
    maxBytesToWrite = 0x7FFFFFFF;
  }
  if (maxBytesToWrite < 4) return 0;
  var startPtr = outPtr;
  var endPtr = startPtr + maxBytesToWrite - 4;
  for (var i = 0; i < str.length; ++i) {
    // Gotcha: charCodeAt returns a 16-bit word that is a UTF-16 encoded code unit, not a Unicode code point of the character! We must decode the string to UTF-32 to the heap.
    // See http://unicode.org/faq/utf_bom.html#utf16-3
    var codeUnit = str.charCodeAt(i); // possibly a lead surrogate
    if (codeUnit >= 0xD800 && codeUnit <= 0xDFFF) {
      var trailSurrogate = str.charCodeAt(++i);
      codeUnit = 0x10000 + ((codeUnit & 0x3FF) << 10) | (trailSurrogate & 0x3FF);
    }
    HEAP32[((outPtr)>>2)]=codeUnit;
    outPtr += 4;
    if (outPtr + 4 > endPtr) break;
  }
  // Null-terminate the pointer to the HEAP.
  HEAP32[((outPtr)>>2)]=0;
  return outPtr - startPtr;
}

// Returns the number of bytes the given Javascript string takes if encoded as a UTF16 byte array, EXCLUDING the null terminator byte.

function lengthBytesUTF32(str) {
  var len = 0;
  for (var i = 0; i < str.length; ++i) {
    // Gotcha: charCodeAt returns a 16-bit word that is a UTF-16 encoded code unit, not a Unicode code point of the character! We must decode the string to UTF-32 to the heap.
    // See http://unicode.org/faq/utf_bom.html#utf16-3
    var codeUnit = str.charCodeAt(i);
    if (codeUnit >= 0xD800 && codeUnit <= 0xDFFF) ++i; // possibly a lead surrogate, so skip over the tail surrogate.
    len += 4;
  }

  return len;
}

// Allocate heap space for a JS string, and write it there.
// It is the responsibility of the caller to free() that memory.
function allocateUTF8(str) {
  var size = lengthBytesUTF8(str) + 1;
  var ret = _malloc(size);
  if (ret) stringToUTF8Array(str, HEAP8, ret, size);
  return ret;
}

// Allocate stack space for a JS string, and write it there.
function allocateUTF8OnStack(str) {
  var size = lengthBytesUTF8(str) + 1;
  var ret = stackAlloc(size);
  stringToUTF8Array(str, HEAP8, ret, size);
  return ret;
}

function demangle(func) {
  return func;
}

function demangleAll(text) {
  var regex =
    /__Z[\w\d_]+/g;
  return text.replace(regex,
    function(x) {
      var y = demangle(x);
      return x === y ? x : (x + ' [' + y + ']');
    });
}

function jsStackTrace() {
  var err = new Error();
  if (!err.stack) {
    // IE10+ special cases: It does have callstack info, but it is only populated if an Error object is thrown,
    // so try that as a special-case.
    try {
      throw new Error(0);
    } catch(e) {
      err = e;
    }
    if (!err.stack) {
      return '(no stack trace available)';
    }
  }
  return err.stack.toString();
}

function stackTrace() {
  var js = jsStackTrace();
  if (Module['extraStackTrace']) js += '\n' + Module['extraStackTrace']();
  return demangleAll(js);
}

// Memory management

var PAGE_SIZE = 16384;
var WASM_PAGE_SIZE = 65536;
var ASMJS_PAGE_SIZE = 16777216;
var MIN_TOTAL_MEMORY = 16777216;

function alignUp(x, multiple) {
  if (x % multiple > 0) {
    x += multiple - (x % multiple);
  }
  return x;
}

var HEAP,
/** @type {ArrayBuffer} */
  buffer,
/** @type {Int8Array} */
  HEAP8,
/** @type {Uint8Array} */
  HEAPU8,
/** @type {Int16Array} */
  HEAP16,
/** @type {Uint16Array} */
  HEAPU16,
/** @type {Int32Array} */
  HEAP32,
/** @type {Uint32Array} */
  HEAPU32,
/** @type {Float32Array} */
  HEAPF32,
/** @type {Float64Array} */
  HEAPF64;

function updateGlobalBuffer(buf) {
  Module['buffer'] = buffer = buf;
}

function updateGlobalBufferViews() {
  Module['HEAP8'] = HEAP8 = new Int8Array(buffer);
  Module['HEAP16'] = HEAP16 = new Int16Array(buffer);
  Module['HEAP32'] = HEAP32 = new Int32Array(buffer);
  Module['HEAPU8'] = HEAPU8 = new Uint8Array(buffer);
  Module['HEAPU16'] = HEAPU16 = new Uint16Array(buffer);
  Module['HEAPU32'] = HEAPU32 = new Uint32Array(buffer);
  Module['HEAPF32'] = HEAPF32 = new Float32Array(buffer);
  Module['HEAPF64'] = HEAPF64 = new Float64Array(buffer);
}

var STATIC_BASE, STATICTOP, staticSealed; // static area
var STACK_BASE, STACKTOP, STACK_MAX; // stack area
var DYNAMIC_BASE, DYNAMICTOP_PTR; // dynamic area handled by sbrk

  STATIC_BASE = STATICTOP = STACK_BASE = STACKTOP = STACK_MAX = DYNAMIC_BASE = DYNAMICTOP_PTR = 0;
  staticSealed = false;




function abortOnCannotGrowMemory() {
  abort('Cannot enlarge memory arrays. Either (1) compile with  -s TOTAL_MEMORY=X  with X higher than the current value ' + TOTAL_MEMORY + ', (2) compile with  -s ALLOW_MEMORY_GROWTH=1  which allows increasing the size at runtime, or (3) if you want malloc to return NULL (0) instead of this abort, compile with  -s ABORTING_MALLOC=0 ');
}

if (!Module['reallocBuffer']) Module['reallocBuffer'] = function(size) {
  var ret;
  try {
    if (ArrayBuffer.transfer) {
      ret = ArrayBuffer.transfer(buffer, size);
    } else {
      var oldHEAP8 = HEAP8;
      ret = new ArrayBuffer(size);
      var temp = new Int8Array(ret);
      temp.set(oldHEAP8);
    }
  } catch(e) {
    return false;
  }
  var success = _emscripten_replace_memory(ret);
  if (!success) return false;
  return ret;
};

function enlargeMemory() {
  // TOTAL_MEMORY is the current size of the actual array, and DYNAMICTOP is the new top.


  var PAGE_MULTIPLE = Module["usingWasm"] ? WASM_PAGE_SIZE : ASMJS_PAGE_SIZE; // In wasm, heap size must be a multiple of 64KB. In asm.js, they need to be multiples of 16MB.
  var LIMIT = 2147483648 - PAGE_MULTIPLE; // We can do one page short of 2GB as theoretical maximum.

  if (HEAP32[DYNAMICTOP_PTR>>2] > LIMIT) {
    return false;
  }

  var OLD_TOTAL_MEMORY = TOTAL_MEMORY;
  TOTAL_MEMORY = Math.max(TOTAL_MEMORY, MIN_TOTAL_MEMORY); // So the loop below will not be infinite, and minimum asm.js memory size is 16MB.

  while (TOTAL_MEMORY < HEAP32[DYNAMICTOP_PTR>>2]) { // Keep incrementing the heap size as long as it's less than what is requested.
    if (TOTAL_MEMORY <= 536870912) {
      TOTAL_MEMORY = alignUp(2 * TOTAL_MEMORY, PAGE_MULTIPLE); // Simple heuristic: double until 1GB...
    } else {
      // ..., but after that, add smaller increments towards 2GB, which we cannot reach
      TOTAL_MEMORY = Math.min(alignUp((3 * TOTAL_MEMORY + 2147483648) / 4, PAGE_MULTIPLE), LIMIT);
    }
  }


  var replacement = Module['reallocBuffer'](TOTAL_MEMORY);
  if (!replacement || replacement.byteLength != TOTAL_MEMORY) {
    // restore the state to before this call, we failed
    TOTAL_MEMORY = OLD_TOTAL_MEMORY;
    return false;
  }

  // everything worked

  updateGlobalBuffer(replacement);
  updateGlobalBufferViews();



  return true;
}

var byteLength;
try {
  byteLength = Function.prototype.call.bind(Object.getOwnPropertyDescriptor(ArrayBuffer.prototype, 'byteLength').get);
  byteLength(new ArrayBuffer(4)); // can fail on older ie
} catch(e) { // can fail on older node/v8
  byteLength = function(buffer) { return buffer.byteLength; };
}

var TOTAL_STACK = Module['TOTAL_STACK'] || 5242880;
var TOTAL_MEMORY = Module['TOTAL_MEMORY'] || 16777216;
if (TOTAL_MEMORY < TOTAL_STACK) err('TOTAL_MEMORY should be larger than TOTAL_STACK, was ' + TOTAL_MEMORY + '! (TOTAL_STACK=' + TOTAL_STACK + ')');

// Initialize the runtime's memory



// Use a provided buffer, if there is one, or else allocate a new one
if (Module['buffer']) {
  buffer = Module['buffer'];
} else {
  // Use a WebAssembly memory where available
  if (typeof WebAssembly === 'object' && typeof WebAssembly.Memory === 'function') {
    Module['wasmMemory'] = new WebAssembly.Memory({ 'initial': TOTAL_MEMORY / WASM_PAGE_SIZE });
    buffer = Module['wasmMemory'].buffer;
  } else
  {
    buffer = new ArrayBuffer(TOTAL_MEMORY);
  }
  Module['buffer'] = buffer;
}
updateGlobalBufferViews();


function getTotalMemory() {
  return TOTAL_MEMORY;
}

// Endianness check (note: assumes compiler arch was little-endian)

function callRuntimeCallbacks(callbacks) {
  while(callbacks.length > 0) {
    var callback = callbacks.shift();
    if (typeof callback == 'function') {
      callback();
      continue;
    }
    var func = callback.func;
    if (typeof func === 'number') {
      if (callback.arg === undefined) {
        Module['dynCall_v'](func);
      } else {
        Module['dynCall_vi'](func, callback.arg);
      }
    } else {
      func(callback.arg === undefined ? null : callback.arg);
    }
  }
}

var __ATPRERUN__  = []; // functions called before the runtime is initialized
var __ATINIT__    = []; // functions called during startup
var __ATMAIN__    = []; // functions called when main() is to be run
var __ATEXIT__    = []; // functions called during shutdown
var __ATPOSTRUN__ = []; // functions called after the main() is called

var runtimeInitialized = false;
var runtimeExited = false;


function preRun() {
  // compatibility - merge in anything from Module['preRun'] at this time
  if (Module['preRun']) {
    if (typeof Module['preRun'] == 'function') Module['preRun'] = [Module['preRun']];
    while (Module['preRun'].length) {
      addOnPreRun(Module['preRun'].shift());
    }
  }
  callRuntimeCallbacks(__ATPRERUN__);
}

function ensureInitRuntime() {
  if (runtimeInitialized) return;
  runtimeInitialized = true;
  callRuntimeCallbacks(__ATINIT__);
}

function preMain() {
  callRuntimeCallbacks(__ATMAIN__);
}

function exitRuntime() {
  callRuntimeCallbacks(__ATEXIT__);
  runtimeExited = true;
}

function postRun() {
  // compatibility - merge in anything from Module['postRun'] at this time
  if (Module['postRun']) {
    if (typeof Module['postRun'] == 'function') Module['postRun'] = [Module['postRun']];
    while (Module['postRun'].length) {
      addOnPostRun(Module['postRun'].shift());
    }
  }
  callRuntimeCallbacks(__ATPOSTRUN__);
}

function addOnPreRun(cb) {
  __ATPRERUN__.unshift(cb);
}

function addOnInit(cb) {
  __ATINIT__.unshift(cb);
}

function addOnPreMain(cb) {
  __ATMAIN__.unshift(cb);
}

function addOnExit(cb) {
  __ATEXIT__.unshift(cb);
}

function addOnPostRun(cb) {
  __ATPOSTRUN__.unshift(cb);
}

// Deprecated: This function should not be called because it is unsafe and does not provide
// a maximum length limit of how many bytes it is allowed to write. Prefer calling the
// function stringToUTF8Array() instead, which takes in a maximum length that can be used
// to be secure from out of bounds writes.
/** @deprecated */
function writeStringToMemory(string, buffer, dontAddNull) {
  warnOnce('writeStringToMemory is deprecated and should not be called! Use stringToUTF8() instead!');

  var /** @type {number} */ lastChar, /** @type {number} */ end;
  if (dontAddNull) {
    // stringToUTF8Array always appends null. If we don't want to do that, remember the
    // character that existed at the location where the null will be placed, and restore
    // that after the write (below).
    end = buffer + lengthBytesUTF8(string);
    lastChar = HEAP8[end];
  }
  stringToUTF8(string, buffer, Infinity);
  if (dontAddNull) HEAP8[end] = lastChar; // Restore the value under the null character.
}

function writeArrayToMemory(array, buffer) {
  HEAP8.set(array, buffer);
}

function writeAsciiToMemory(str, buffer, dontAddNull) {
  for (var i = 0; i < str.length; ++i) {
    HEAP8[((buffer++)>>0)]=str.charCodeAt(i);
  }
  // Null-terminate the pointer to the HEAP.
  if (!dontAddNull) HEAP8[((buffer)>>0)]=0;
}

function unSign(value, bits, ignore) {
  if (value >= 0) {
    return value;
  }
  return bits <= 32 ? 2*Math.abs(1 << (bits-1)) + value // Need some trickery, since if bits == 32, we are right at the limit of the bits JS uses in bitshifts
                    : Math.pow(2, bits)         + value;
}
function reSign(value, bits, ignore) {
  if (value <= 0) {
    return value;
  }
  var half = bits <= 32 ? Math.abs(1 << (bits-1)) // abs is needed if bits == 32
                        : Math.pow(2, bits-1);
  if (value >= half && (bits <= 32 || value > half)) { // for huge values, we can hit the precision limit and always get true here. so don't do that
                                                       // but, in general there is no perfect solution here. With 64-bit ints, we get rounding and errors
                                                       // TODO: In i64 mode 1, resign the two parts separately and safely
    value = -2*half + value; // Cannot bitshift half, as it may be at the limit of the bits JS uses in bitshifts
  }
  return value;
}


var Math_abs = Math.abs;
var Math_cos = Math.cos;
var Math_sin = Math.sin;
var Math_tan = Math.tan;
var Math_acos = Math.acos;
var Math_asin = Math.asin;
var Math_atan = Math.atan;
var Math_atan2 = Math.atan2;
var Math_exp = Math.exp;
var Math_log = Math.log;
var Math_sqrt = Math.sqrt;
var Math_ceil = Math.ceil;
var Math_floor = Math.floor;
var Math_pow = Math.pow;
var Math_imul = Math.imul;
var Math_fround = Math.fround;
var Math_round = Math.round;
var Math_min = Math.min;
var Math_max = Math.max;
var Math_clz32 = Math.clz32;
var Math_trunc = Math.trunc;

// A counter of dependencies for calling run(). If we need to
// do asynchronous work before running, increment this and
// decrement it. Incrementing must happen in a place like
// PRE_RUN_ADDITIONS (used by emcc to add file preloading).
// Note that you can add dependencies in preRun, even though
// it happens right before run - run will be postponed until
// the dependencies are met.
var runDependencies = 0;
var runDependencyWatcher = null;
var dependenciesFulfilled = null; // overridden to take different actions when all run dependencies are fulfilled

function getUniqueRunDependency(id) {
  return id;
}

function addRunDependency(id) {
  runDependencies++;
  if (Module['monitorRunDependencies']) {
    Module['monitorRunDependencies'](runDependencies);
  }
}

function removeRunDependency(id) {
  runDependencies--;
  if (Module['monitorRunDependencies']) {
    Module['monitorRunDependencies'](runDependencies);
  }
  if (runDependencies == 0) {
    if (runDependencyWatcher !== null) {
      clearInterval(runDependencyWatcher);
      runDependencyWatcher = null;
    }
    if (dependenciesFulfilled) {
      var callback = dependenciesFulfilled;
      dependenciesFulfilled = null;
      callback(); // can add another dependenciesFulfilled
    }
  }
}

Module["preloadedImages"] = {}; // maps url to image data
Module["preloadedAudios"] = {}; // maps url to audio data



var memoryInitializer = null;






// Prefix of data URIs emitted by SINGLE_FILE and related options.
var dataURIPrefix = 'data:application/octet-stream;base64,';

// Indicates whether filename is a base64 data URI.
function isDataURI(filename) {
  return String.prototype.startsWith ?
      filename.startsWith(dataURIPrefix) :
      filename.indexOf(dataURIPrefix) === 0;
}




function integrateWasmJS() {
  // wasm.js has several methods for creating the compiled code module here:
  //  * 'native-wasm' : use native WebAssembly support in the browser
  //  * 'interpret-s-expr': load s-expression code from a .wast and interpret
  //  * 'interpret-binary': load binary wasm and interpret
  //  * 'interpret-asm2wasm': load asm.js code, translate to wasm, and interpret
  //  * 'asmjs': no wasm, just load the asm.js code and use that (good for testing)
  // The method is set at compile time (BINARYEN_METHOD)
  // The method can be a comma-separated list, in which case, we will try the
  // options one by one. Some of them can fail gracefully, and then we can try
  // the next.

  // inputs

  var method = 'native-wasm';

  var wasmTextFile = '';
  var wasmBinaryFile = 'data:application/octet-stream;base64,AGFzbQEAAAABgARAYAF/AGADf39/AGACf38Bf2AAAX9gBX9/fn9/AGACf38AYAN/f38Bf2ABfwF/YAF/AXxgAnx8AXxgBH9/f38AYAZ/f39/f38Bf2AEf39/fwF/YAV/f39/fwF/YAh/f39/f39/fwF/YAAAYAZ/f39/f38AYAV/f39/fwBgBX9/f398AX9gBn9/f39/fAF/YAd/f39/f39/AX9gBX9/f39+AX9gAn98AGAEf39/fABgDX9/f39/f39/f39/f38AYAh/f39/f39/fwBgAXwBfGACfX0AYAN/f34AYAJ/fQBgAX8BfWAEf39/fgF+YAN/f38BfGAFf39/f38BfGAGf39/f39/AXxgAn9/AX5gAnx/AXxgAXwBfmADfn9/AX9gAn5/AX9gBn98f39/fwF/YAN/f38BfmABfAF9YAJ9fwF/YAJ9fwF9YAJ8fwF9YAJ/fwF9YAJ/fwF8YAF9AX1gCn9/f39/f39/f38Bf2AMf39/f39/f39/f39/AX9gA39/fwF9YAR/f39/AX5gB39/f39/f38AYAt/f39/f39/f39/fwF/YAp/f39/f39/f39/AGAPf39/f39/f39/f39/f39/AGADf399AGAHf39/f39/fAF/YAl/f39/f39/f38Bf2AGf39/f39+AX9gA39/fABgBX9/f398AGAGf39/fn9/AALMCTUDZW52Bm1lbW9yeQIAgAIDZW52BXRhYmxlAXABzwXPBQNlbnYJdGFibGVCYXNlA38AA2Vudg5EWU5BTUlDVE9QX1BUUgN/AANlbnYIU1RBQ0tUT1ADfwADZW52CVNUQUNLX01BWAN/AAZnbG9iYWwDTmFOA3wABmdsb2JhbAhJbmZpbml0eQN8AANlbnYFYWJvcnQAAANlbnYNZW5sYXJnZU1lbW9yeQADA2Vudg5nZXRUb3RhbE1lbW9yeQADA2VudhdhYm9ydE9uQ2Fubm90R3Jvd01lbW9yeQADA2Vudg5fX19hc3NlcnRfZmFpbAAKA2VudhlfX19jeGFfYWxsb2NhdGVfZXhjZXB0aW9uAAcDZW52E19fX2N4YV9wdXJlX3ZpcnR1YWwADwNlbnYMX19fY3hhX3Rocm93AAEDZW52GV9fX2N4YV91bmNhdWdodF9leGNlcHRpb24AAwNlbnYHX19fbG9jawAAA2VudgtfX19tYXBfZmlsZQACA2VudgtfX19zZXRFcnJObwAAA2Vudg1fX19zeXNjYWxsMTQwAAIDZW52DV9fX3N5c2NhbGwxNDYAAgNlbnYLX19fc3lzY2FsbDYAAgNlbnYMX19fc3lzY2FsbDkxAAIDZW52CV9fX3VubG9jawAAA2VudhZfX2VtYmluZF9yZWdpc3Rlcl9ib29sABEDZW52F19fZW1iaW5kX3JlZ2lzdGVyX2NsYXNzABgDZW52I19fZW1iaW5kX3JlZ2lzdGVyX2NsYXNzX2NvbnN0cnVjdG9yABADZW52IF9fZW1iaW5kX3JlZ2lzdGVyX2NsYXNzX2Z1bmN0aW9uABkDZW52F19fZW1iaW5kX3JlZ2lzdGVyX2VtdmFsAAUDZW52F19fZW1iaW5kX3JlZ2lzdGVyX2Zsb2F0AAEDZW52GV9fZW1iaW5kX3JlZ2lzdGVyX2ludGVnZXIAEQNlbnYdX19lbWJpbmRfcmVnaXN0ZXJfbWVtb3J5X3ZpZXcAAQNlbnYcX19lbWJpbmRfcmVnaXN0ZXJfc3RkX3N0cmluZwAFA2Vudh1fX2VtYmluZF9yZWdpc3Rlcl9zdGRfd3N0cmluZwABA2VudhZfX2VtYmluZF9yZWdpc3Rlcl92b2lkAAUDZW52Bl9hYm9ydAAPA2Vudg9fZW1zY3JpcHRlbl9sb2cABQNlbnYWX2Vtc2NyaXB0ZW5fbWVtY3B5X2JpZwAGA2VudgdfZ2V0ZW52AAcDZW52Dl9sbHZtX2V4cDJfZjMyABoDZW52El9sbHZtX3N0YWNrcmVzdG9yZQAAA2Vudg9fbGx2bV9zdGFja3NhdmUAAwNlbnYKX2xsdm1fdHJhcAAPA2VudhJfcHRocmVhZF9jb25kX3dhaXQAAgNlbnYUX3B0aHJlYWRfZ2V0c3BlY2lmaWMABwNlbnYTX3B0aHJlYWRfa2V5X2NyZWF0ZQACA2VudhZfcHRocmVhZF9tdXRleF9kZXN0cm95AAcDZW52DV9wdGhyZWFkX29uY2UAAgNlbnYUX3B0aHJlYWRfc2V0c3BlY2lmaWMAAgNlbnYLX3N0cmZ0aW1lX2wADQNlbnYFX3RpbWUABwhhc20yd2FzbQdmNjQtcmVtAAkDxQbDBgcHAwAFBQADDwcABwoKBgYHAwEXAQAABAoHAgIAAAAAAAAAABYFBwUFBwUAAAcFBQIHAAAADw8bAAELBQAAAQECBQYCBQoFAQUACgECBw8BAQ8BAAABAAUBBQEBHAAAAAEBBQUFAAAAAQEFHR0dAB0dHR0HAAUFBQEAAR4eHQAAAAAAAAAFBwUFAgcHBQUCBwcFBQIHAAAADwECAgEAAgEAAAEBBQUFBQUADwcHAAIFBwYGBwMHBwMHAgcHBwcDAwcBAgYCBwYGBgYFBwIcDAcfICEiIyQJCSQJJQkHBwYGAQYNAQcBJicnBxECKCQkAgICBgwMBgcABwcCBgIFBx8GBwcpDCkpKQIAAwYqKissLQYGDw0uIC8vLi8vBgYGDDAwGjAaBwYAAAAAAAAGBAoGBwcCBgcGAQAAAAAHBQUHBQAFBwUABgUCAA0KBgEFDQoGAQULCwsLCwsLCwsLAgAxAwwHAgAKAAANETIgCg0gDTMNBwE0DQwNDA00DQwUCwsLCwsLCwsLCzENETINDQ0CAQINDQ0NFA0NFQ0VEhINDQYGDDUKNQ0NFQ0VEhINCzU1BwsLCwsLDgcHBwcHBwcPDw8QEA4REREREREKEBEREREKDQsLCwsLDgcHBwcHBwcHDw8PEBAOERERERERChARERERCg0AABQQAgAUEAIPBwUFBQcFFBQ2BgY3AQEUFDYGNxMLNzgTCzc4BhAQDg4NDQcGCwsODQ4ODQcNBwAADg4NBgsLAAAAAAACBgIGAgwGDQAABwcFBQUAAAcHBQUFBgwMDAIGAgYCDAYNDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDwUAAAABBQAADw8PDwMPDw8FAwACAAAAAAUHAAUHBQUFBQEABgoAAgYGGQACBQIRBgUGBgIBAQEGARkAAhEGBQcCAgAAAB4uLgUAAR05AwMPAwUGEBEKAgEBCgIQEQoPAAAABwAHAAAGBgIQEQoKEBEHAwYHDwcGBgYHLwIGDA0TCzoUDjs8AAU9AQo+ERA1PwgDBwIGDBINEwsUDhUPABYFARcKERAEFDUGKQh/ASMBC38BIwILfwEjAwt/AUEAC38BQQALfAEjBAt8ASMFC38BQQALB/4HNxBfX2dyb3dXYXNtTWVtb3J5AC0lX19HTE9CQUxfX3N1Yl9JX0F1ZGlvRW5naW5lQ29tbW9uX2NwcABiF19fR0xPQkFMX19zdWJfSV9EU1BfY3BwAGMeX19HTE9CQUxfX3N1Yl9JX01JRElQYXJzZXJfY3BwAHseX19HTE9CQUxfX3N1Yl9JX011c2ljVXRpbHNfY3BwAH4dX19HTE9CQUxfX3N1Yl9JX1ZBU3ludGhBV19jcHAANRtfX0dMT0JBTF9fc3ViX0lfVkFTeW50aF9jcHAAxQEYX19HTE9CQUxfX3N1Yl9JX2JpbmRfY3BwANcBGl9fWlN0MTh1bmNhdWdodF9leGNlcHRpb252AJQGEF9fX2N4YV9jYW5fY2F0Y2gAuQYWX19fY3hhX2lzX3BvaW50ZXJfdHlwZQC6BhFfX19lcnJub19sb2NhdGlvbgDhAQ5fX19nZXRUeXBlTmFtZQDYAQVfZnJlZQDaAQ9fbGx2bV9ic3dhcF9pMzIAvAYHX21hbGxvYwDZAQdfbWVtY3B5AL0GCF9tZW1tb3ZlAL4GB19tZW1zZXQAvwYXX3B0aHJlYWRfY29uZF9icm9hZGNhc3QAVhNfcHRocmVhZF9tdXRleF9sb2NrAFYVX3B0aHJlYWRfbXV0ZXhfdW5sb2NrAFYFX3NicmsAwAYHX3N0cmxlbgDqAQpkeW5DYWxsX2RpAMEGCWR5bkNhbGxfaQA9CmR5bkNhbGxfaWkAwgYLZHluQ2FsbF9paWkAwwYMZHluQ2FsbF9paWlpAMQGDWR5bkNhbGxfaWlpaWkAxQYOZHluQ2FsbF9paWlpaWQAxgYOZHluQ2FsbF9paWlpaWkAxwYPZHluQ2FsbF9paWlpaWlkAMgGD2R5bkNhbGxfaWlpaWlpaQDJBhBkeW5DYWxsX2lpaWlpaWlpAMoGEWR5bkNhbGxfaWlpaWlpaWlpAMsGDmR5bkNhbGxfaWlpaWlqAO4GCWR5bkNhbGxfdgDNBgpkeW5DYWxsX3ZpAM4GC2R5bkNhbGxfdmlkAM8GC2R5bkNhbGxfdmlpANAGDGR5bkNhbGxfdmlpaQDRBg1keW5DYWxsX3ZpaWlkANIGDWR5bkNhbGxfdmlpaWkA0wYOZHluQ2FsbF92aWlpaWkA1AYPZHluQ2FsbF92aWlpaWlpANUGDmR5bkNhbGxfdmlpamlpAO8GE2VzdGFibGlzaFN0YWNrU3BhY2UAMQtnZXRUZW1wUmV0MAA0C3J1blBvc3RTZXRzALsGC3Nl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ASIAIAE2AgAgAEEEaiAEKAIAIgIgARC9BhogAhDhBQUgAEH/AXEiAUEEahDZASIAIAE2AgAgAEEEaiAEIAEQvQYaCyADLAALQQBOBEAgBSQHIAAPCyADKAIAEOEFIAUkByAAC/4BAQV/IwchBCMHQRBqJAcgBCEDIAAoAgAhBSABIAAoAgQiAEEBdWohBiAAQQFxBEAgBigCACAFaigCACEFCyACQQRqIQcgAigCACEBIANCADcCACADQQA2AgggAUFvSwRAEKwECwJAAkAgAUELSQR/IAMgAToACyABBH8gAyEADAIFIAMLBSADIAFBEGpBcHEiAhDgBSIANgIAIAMgAkGAgICAeHI2AgggAyABNgIEDAELIQAMAQsgACAHIAEQvQYaCyAAIAFqQQA6AAAgBiADIAVBH3FBgwFqEQIAIQAgAywAC0EATgRAIAQkByAADwsgAygCABDhBSAEJAcgAAsNACAAQQFxQQFqEQMAC4oFAQV/QfAEEOAFIgFBAEHwBBC/BhogAUHgHTYCACABQQA2AhAgAUEANgIUIAFDAAAAQDgCGCABQYDAADsBHCABQSBqIgNBADYCACABQSRqIgJBADYCACABQShqIgRBADYCACACQYABEOAFIgA2AgAgAyAANgIAIAQgAEGAAWo2AgBBgAEhAwNAIABBADoAACACIAIoAgBBAWoiADYCACADQX9qIgMNAAsgAUEsaiIAQQA2AgAgAUEwaiIDQQA2AgAgAUE0aiICQQA2AgAgAEGABBDgBSIANgIAIAIgAEGABGoiAjYCACAAQQBBgAQQvwYaIAMgAjYCACABQX87ATggAUFAayIAQQA2AgAgAUEANgJEIAEgADYCPCABQwAAAAA4AkggAUHQAGoiAEIANwMAIABCADcDCCAAQgA3AxAgAUEANgKYAiABQewAaiIAQgA3AgAgAEIANwIIIABCADcCECAAQgA3AhggAUGoA2oiAEIANwIAIABCADcCCCAAQgA3AhAgAEIANwIYIAFDAACAPzgCyAMgAUHMA2oiAEIANwIAIABCADcCCCAAQgA3AhAgAUMAAIA/OALkAyABQegDaiIAQgA3AgAgAEIANwIIIABCADcCECAAQgA3AhggAUGIBGoiACAANgIAIAEgADYCjAQgAUEANgKQBCABQZQEaiIAIAA2AgAgASAANgKYBCAB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QdsARgRAIAFBBGoiDigCACEGIAVB/wFxIQUgAyANBH8gBgUgBSIGC0F/amosAABB3QBGBEAgCCABQQEgBkF+ahDrBSAKLAAAQQBIBEAgDCgCAEEAOgAAIA5BADYCAAUgB0EAOgAAIApBADoAAAsgARDxBSAHIAgpAgA3AgAgByAIKAIINgIIIA4oAgAhBiAKLAAAIgNB/wFxIQUCfyADQQBIBH8gBgUgBQsEfyAIQQtqIR8gAEEEaiENIABBCGohFSAAQRBqIQUgAEEoaiEWIABBLGohFyAAQShqIRggAEEkaiEUIABBMGohDyAEQTBqIRsgBEEoaiEcIARBGGoiHUELaiEeIARBMGohICAEQShqISEgBEEYaiIiQQtqISMCQANAIAhCADcCACAIQQA2AgggA0H/AXEhCQJ/AkAgA0EYdEEYdUEASCIDBH8gBgUgCQtFDQBBACEGAkACQANAAkAgDCgCACEJAkACQAJAIAMEfyAJBSAHCyAGaiwAACIDQSxrDlABAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgACAQICAgICAgICAgICAgICAgICAgICAgICAgICAgICAAILDAQLDAELIAggAxD3BSAKLAAAIhFBAEghAyAOKAIAIQkgEUH/AXEhESAGIAMEfyAJBSARIgkLQX9qRg0AIAZBAWoiBiAJSQ0BDAQLCwwBCyAEIAEgEyACEHcgEywAAARAIABBADYCACANQQA2AgAgFUMAAAAAOAIAIBZBADYCACAXQQA2AgAgBUIANwMAIAVCADcDCCAFQQA2AhAgFCAYNgIAIA9CADcCACAPQQA2AgggD0EAOgAMIBsQaSAcKAIAEGogHiwAAEEASARAIB0oAgAQ4QULQQEMAwsgBCgCAARAIBAoAgAiAyAaKAIARgRAIAsgBBBzBSADIAQQaCAQIANBQGs2AgALCyAbEGkgHCgCABBqIB4sAABBAEgEQCAdKAIAEOEFCwwBCyAEIAggEyACEHcgEywAAAR/IABBADYCACANQQA2AgAgFUMAAAAAOAIAIBZBADYCACAXQQA2AgAgBUIANwMAIAVCADcDCCAFQQA2AhAgFCAYNgIAIA9CADcCACAPQQA2AgggD0EAOgAMQQEFIAQoAgAEQCAQKAIAIgMgGigCAEYEQCALIAQQcwUgAyAEEGggECADQUBrNgIACwsgDigCACEDIAosAAAiCUH/AXEhESAZIAEgBkEBaiAJQQBIBH8gAwUgEQsQ6wUgCiwAAEEASARAIAwoAgBBADoAACAOQQA2AgAFIAdBADoAACAKQQA6AAALIAEQ8QUgByAZKQIANwIAIAcgGSgCCDYCCEEECyEDICAQaSAhKAIAEGogIywAAEEASARAICIoAgAQ4QULIANBBEYNAEEBDAELQQALIQMgHywAAEEASARAIAgoAgAQ4QULIAMNASAOKAIAIQYgCiwAACIDQf8BcSEJIANBAEgEfyAGBSAJCw0ACyAQKAIAIQIgCygCACEDIAAMAgsgCxBpIBIkBw8FIABBJGohFCAAQQRqIQ0gAEEIaiEVIABBKGohFiAAQSxqIRcgAEEoaiEYIABBEGohBUEAIQJBACEDIAALCyIBQQY2AgAgDUEANgIAIBVDAAAAADgCACAWQQA2AgAgF0EANgIAIAVCADcDACAFQgA3AwggBUEANgIQIBQgGDYCACAAQTBqIgRBADYCACAAQTRqIgZBADYCACAAQThqIgVBADYCACACIANrIgdBBnUhDCADIQEgAiEDIAcEQCAMQf///x9LBEAQrAQLIAYgBxDgBSICNgIAIAQgAjYCACAFIAIgDEEGdGo2AgAgASADRwRAA0AgAiABEGggBiAGKAIAQUBrIgI2AgAgAUFAayIBIANHDQALCwsgAEEAOgA8IAsQaSASJAcPCwsgAEEANgIAIABBADYCBCAAQwAAAAA4AgggAEEANgIoIABBADYCLCAAQRBqIgFCADcDACABQgA3AwggAUEANgIQIAAgAEEoajYCJCAAQTBqIgBCADcCACAAQQA2AgggAEEAOgAMIAsQaSASJAcL9AYBDX8gAUEUaiIHKAIAIQwgAEELaiINLAAAIgJBAEghAyAAQQRqIg4oAgAhBSACQf8BcSECIAMEfyAFBSACC0EBTQRAQQEPCyABQQhqIQkgAUEEaiEKIAFBEGohC0EBIQVBACECAkADQCAAKAIAIQQCQCADBH8gBAUgAAsiAyAFaiwAACIEQSJGBH8gAyAFQX9qaiwAAEHcAEYEQCAFQQFNDQIgAyAFQX5qaiwAAEHcAEcNAgsgAkEBcwUgAgR/QQEFAkACQAJAAkACQCAEQdsAaw4jAAQCBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQBBAMECyAJKAIAIAooAgAiAmsiBEEIdEF/aiEGIAcoAgAiCCALKAIAaiEDIAQEfyAGBUEACyADRgRAIAEQdiALKAIAIAcoAgAiAmohAyAKKAIAIQQFIAIhBCAIIQILIAQgA0EKdkECdGooAgAgA0H/B3FBAnRqQQE2AgAgByACQQFqNgIAQQAhAgwGCyAJKAIAIAooAgAiAmsiBEEIdEF/aiEGIAcoAgAiCCALKAIAaiEDIAQEfyAGBUEACyADRgRAIAEQdiALKAIAIAcoAgAiAmohAyAKKAIAIQQFIAIhBCAIIQILIAQgA0EKdkECdGooAgAgA0H/B3FBAnRqQQA2AgAgByACQQFqNgIAQQAhAgwFCyAKKAIAIgMgBygCACICQX9qIgQgCygCACIIaiIGQQp2QQJ0aigCACAGQf8HcUECdGooAgBBAUcEQEF/IQUMBwsgByAENgIAIAkoAgAiBCADayIDQQh0QX9qIQZBASACayAIayADBH8gBgVBAAtqQf8PSwRAIARBfGooAgAQ4QUgCSAJKAIAQXxqNgIACyACIAxGDQZBACECDAQLIAooAgAiAyAHKAIAIgJBf2oiBCALKAIAIghqIgZBCnZBAnRqKAIAIAZB/wdxQQJ0aigCAARAQX8hBQwGCyAHIAQ2AgAgCSgCACIEIANrIgNBCHRBf2ohBkEBIAJrIAhrIAMEfyAGBUEAC2pB/w9LBEAgBEF8aigCABDhBSAJIAkoAgBBfGo2AgALIAIgDEYNBUEAIQIMAwtBAAsLIQILIA0sAAAiBEEASCEDIA4oAgAhCCAEQf8BcSEEIAVBAWoiBSADBH8gCAUgBAtJDQALCyAFC4kBAQN/IwchASMHQRBqJAcgACABQQxqIgJBARDzAhogACgCBEEBRiEDIAEiAEIANwIAIABBADYCCCAAQQk6AAsgAEGM+QApAAA3AAAgAEGU+QAsAAA6AAggAEEAOgAJIAMEQCACLAAAIQAgASQHIAAPBUEIEAUiASAAEOUFIAFBiBlBkwEQBwtBAAudMAEffyMHIRsjB0GAA2okB0HE5QFB5NDR6gQ2AgBByOUBQevk0eoENgIAIBsiAUIANwIAIAFCADcCCCABQSAQ4AUiADYCBCABQaCAgIB4NgIMIAFBFDYCCCAAQZb5ACkAADcAACAAQZ75ACkAADcACCAAQab5ACgAADYAECAAQQA6ABQgAUEBNgIQIAFBFGoiAkIANwIAIAJBADYCCCACQQtqIhxBCToAACACQav5ACkAADcAACACQbP5ACwAADoACCACQQA6AAkgAUECNgIgIAFBJGoiA0IANwIAIANBADYCCCADQRAQ4AUiADYCACABQZCAgIB4NgIsIAFBDjYCKCAAQbX5ACkAADcAACAAQb35ACgAADYACCAAQcH5AC4AADsADCAAQQA6AA4gAUEDNgIwIAFBNGoiBEIANwIAIARBADYCCCAEQSAQ4AUiADYCACABQaCAgIB4NgI8IAFBEjYCOCAAQcT5ACkAADcAACAAQcz5ACkAADcACCAAQdT5AC4AADsAECAAQQA6ABIgAUFAa0EENgIAIAFBxABqIgVCADcCACAFQQA2AgggBUEgEOAFIgA2AgAgAUGggICAeDYCTCABQRQ2AkggAEHX+QApAAA3AAAgAEHf+QApAAA3AAggAEHn+QAoAAA2ABAgAEEAOgAUIAFBBTYCUCABQdQAaiIGQQtqIh1BCjoAACAGQez5ACkAADcAACAGQfT5AC4AADsACCAGQQA6AAogAUEGNgJgIAFB5ABqIgdCADcCACAHQQA2AgggB0EQEOAFIgA2AgAgAUGQgICAeDYCbCABQQs2AmggAEH3+QApAAA3AAAgAEH/+QAuAAA7AAggAEGB+gAsAAA6AAogAEEAOgALIAFBBzYCcCABQfQAaiIIQgA3AgAgCEEANgIIIAhBC2oiHkEIOgAAIAhCzYrRivTr0KrFADcCACABQQA6AHwgAUEJNgKAASABQYQBaiIJQgA3AgAgCUEANgIIIAlBIBDgBSIANgIAIAFBoICAgHg2AowBIAFBEDYCiAEgAEGD+gApAAA3AAAgAEGL+gApAAA3AAggAEEAOgAQIAFBIDYCkAEgAUGUAWoiCkIANwIAIApBADYCCCAKQSAQ4AUiADYCACABQaCAgIB4NgKcASABQRM2ApgBIABBlPoAKQAANwAAIABBnPoAKQAANwAIIABBpPoALgAAOwAQIABBpvoALAAAOgASIABBADoAEyABQSE2AqABIAFBpAFqIgtCADcCACALQQA2AgggC0EgEOAFIgA2AgAgAUGggICAeDYCrAEgAUEQNgKoASAAQaj6ACkAADcAACAAQbD6ACkAADcACCAAQQA6ABAgAUEvNgKwASABQbQBaiIMQgA3AgAgDEEANgIIIAxBIBDgBSIANgIAIAFBoICAgHg2ArwBIAFBETYCuAEgAEG5+gApAAA3AAAgAEHB+gApAAA3AAggAEHJ+gAsAAA6ABAgAEEAOgARIAFB0QA2AsABIAFBxAFqIg1CADcCACANQQA2AgggDUEQEOAFIgA2AgAgAUGQgICAeDYCzAEgAUEONgLIASAAQcv6ACkAADcAACAAQdP6ACgAADYACCAAQdf6AC4AADsADCAAQQA6AA4gAUHUADYC0AEgAUHUAWoiDkIANwIAIA5BADYCCCAOQSAQ4AUiADYCACABQaCAgIB4NgLcASABQRE2AtgBIABB2voAKQAANwAAIABB4voAKQAANwAIIABB6voALAAAOgAQIABBADoAESABQdgANgLgASABQeQBaiIPQgA3AgAgD0EANgIIIA9BIBDgBSIANgIAIAFBoICAgHg2AuwBIAFBEzYC6AEgAEHs+gApAAA3AAAgAEH0+gApAAA3AAggAEH8+gAuAAA7ABAgAEH++gAsAAA6ABIgAEEAOgATIAFB2QA2AvABIAFB9AFqIhBCADcCACAQQQA2AgggEEEgEOAFIgA2AgAgAUGggICAeDYC/AEgAUESNgL4ASAAQYD7ACkAADcAACAAQYj7ACkAADcACCAAQZD7AC4AADsAECAAQQA6ABIgAUH/ADYCgAIgAUGEAmoiEUIANwIAIBFBADYCCCARQSAQ4AUiADYCACABQaCAgIB4NgKMAiABQRc2AogCIABBk/sAKQAANwAAIABBm/sAKQAANwAIIABBo/sAKAAANgAQIABBp/sALgAAOwAUIABBqfsALAAAOgAWIABBADoAFyABQQg2ApACIAFBlAJqIhJCADcCACASQQA2AgggEkEgEOAFIgA2AgAgAUGggICAeDYCnAIgAUERNgKYAiAAQav7ACkAADcAACAAQbP7ACkAADcACCAAQbv7ACwAADoAECAAQQA6ABEgAUEKNgKgAiABQaQCaiITQgA3AgAgE0EANgIIIBNBIBDgBSIANgIAIAFBoICAgHg2AqwCIAFBETYCqAIgAEG9+wApAAA3AAAgAEHF+wApAAA3AAggAEHN+wAsAAA6ABAgAEEAOgARIAFBCzYCsAIgAUG0AmoiFEIANwIAIBRBADYCCCAUQSAQ4AUiADYCACABQaCAgIB4NgK8AiABQRE2ArgCIABBz/sAKQAANwAAIABB1/sAKQAANwAIIABB3/sALAAAOgAQIABBADoAESABQQw2AsACIAFBxAJqIhVCADcCACAVQQA2AgggFUEgEOAFIgA2AgAgAUGggICAeDYCzAIgAUERNgLIAiAAQeH7ACkAADcAACAAQen7ACkAADcACCAAQfH7ACwAADoAECAAQQA6ABEgAUENNgLQAiABQdQCaiIWQgA3AgAgFkEANgIIIBZBIBDgBSIANgIAIAFBoICAgHg2AtwCIAFBETYC2AIgAEHz+wApAAA3AAAgAEH7+wApAAA3AAggAEGD/AAsAAA6ABAgAEEAOgARIAFBDjYC4AIgAUHkAmoiF0IANwIAIBdBADYCCCAXQSAQ4AUiADYCACABQaCAgIB4NgLsAiABQRE2AugCIABBhfwAKQAANwAAIABBjfwAKQAANwAIIABBlfwALAAAOgAQIABBADoAESABQQ82AvACIAFB9AJqIhhCADcCACAYQQA2AgggGEEgEOAFIgA2AgAgAUGggICAeDYC/AIgAUERNgL4AiAAQZf8ACkAADcAACAAQZ/8ACkAADcACCAAQaf8ACwAADoAECAAQQA6ABFBsOUBQQA2AgBBtOUBQQA2AgBBrOUBQbDlATYCAEGw5QEgASgCACABEHxBsOUBIAFBEGoiACgCACAAEHxBsOUBIAFBIGoiACgCACAAEHxBsOUBIAFBMGoiACgCACAAEHxBsOUBIAFBQGsiACgCACAAEHxBsOUBIAFB0ABqIgAoAgAgABB8QbDlASABQeAAaiIAKAIAIAAQfEGw5QEgAUHwAGoiACgCACAAEHxBsOUBIAFBgAFqIgAoAgAgABB8QbDlASABQZABaiIAKAIAIAAQfEGw5QEgAUGgAWoiACgCACAAEHxBsOUBIAFBsAFqIgAoAgAgABB8QbDlASABQcABaiIAKAIAIAAQfEGw5QEgAUHQAWoiACgCACAAEHxBsOUBIAFB4AFqIgAoAgAgABB8QbDlASABQfABaiIAKAIAIAAQfEGw5QEgAUGAAmoiACgCACAAEHxBsOUBIAFBkAJqIgAoAgAgABB8QbDlASABQaACaiIAKAIAIAAQfEGw5QEgAUGwAmoiACgCACAAEHxBsOUBIAFBwAJqIgAoAgAgABB8QbDlASABQdACaiIAKAIAIAAQfEGw5QEgAUHgAmoiACgCACAAEHxBsOUBIAFB8AJqIgAoAgAgABB8IBgsAAtBAEgEQCAYKAIAEOEFCyAXLAALQQBIBEAgFygCABDhBQsgFiwAC0EASARAIBYoAgAQ4QULIBUsAAtBAEgEQCAVKAIAEOEFCyAULAALQQBIBEAgFCgCABDhBQsgEywAC0EASARAIBMoAgAQ4QULIBIsAAtBAEgEQCASKAIAEOEFCyARLAALQQBIBEAgESgCABDhBQsgECwAC0EASARAIBAoAgAQ4QULIA8sAAtBAEgEQCAPKAIAEOEFCyAOLAALQQBIBEAgDigCABDhBQsgDSwAC0EASARAIA0oAgAQ4QULIAwsAAtBAEgEQCAMKAIAEOEFCyALLAALQQBIBEAgCygCABDhBQsgCiwAC0EASARAIAooAgAQ4QULIAksAAtBAEgEQCAJKAIAEOEFCyAeLAAAQQBIBEAgCCgCABDhBQsgBywAC0EASARAIAcoAgAQ4QULIB0sAABBAEgEQCAGKAIAEOEFCyAFLAALQQBIBEAgBSgCABDhBQsgBCwAC0EASARAIAQoAgAQ4QULIAMsAAtBAEgEQCADKAIAEOEFCyAcLAAAQQBIBEAgAigCABDhBQsgAUEEaiIALAALQQBIBEAgACgCABDhBQsgAUGAATYCACABQQRqIgNCADcCACADQQA2AgggA0ELaiIWQQg6AAAgA0LOntGq9OuTo8YANwIAIAFBADoADCABQZABNgIQIAFBgICAODYCHCABQRRqIhpBC2ohFyAaQan8ACgAADYAACAaQa38AC4AADsABCAaQa/8ACwAADoABiAaQQA6AAcgAUGgATYCICABQSRqIgRCADcCACAEQQA2AgggBEEgEOAFIgA2AgAgAUGggICAeDYCLCABQRA2AiggAEGx/AApAAA3AAAgAEG5/AApAAA3AAggAEEAOgAQIAFBsAE2AjAgAUE0aiIFQgA3AgAgBUEANgIIIAVBEBDgBSIANgIAIAFBkICAgHg2AjwgAUEONgI4IABBwvwAKQAANwAAIABByvwAKAAANgAIIABBzvwALgAAOwAMIABBADoADiABQUBrQcABNgIAIAFBgICAODYCTCABQcQAaiICQQtqIRggAkHR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QRxqNgIAIAFBiANqIQAgPSwAAEEASARAICYoAgAQ4QULIAAsAAtBAEgEQCAAKAIAEOEFCyABQewCaiEAIDwsAABBAEgEQCAkKAIAEOEFCyAALAALQQBIBEAgACgCABDhBQsgAUHQAmohACA7LAAAQQBIBEAgIigCABDhBQsgACwAC0EASARAIAAoAgAQ4QULIAFBtAJqIQAgOiwAAEEASARAICAoAgAQ4QULIAAsAAtBAEgEQCAAKAIAEOEFCyABQZgCaiEAIDksAABBAEgEQCAeKAIAEOEFCyAALAALQQBIBEAgACgCABDhBQsgAUH8AWohACA4LAAAQQBIBEAgHCgCABDhBQsgACwAC0EASARAIAAoAgAQ4QULIAFB4AFqIQAgNywAAEEASARAIBooAgAQ4QULIAAsAAtBAEgEQCAAKAIAEOEFCyABQcQBaiEAIDYsAABBAEgEQCAZKAIAEOEFCyAALAALQQBIBEAgACgCABDhBQsgAUGoAWohACA0LAAAQQBIBEAgGCgCABDhBQsgACwAC0EASARAIAAoAgAQ4QULIAFBjAFqIQAgMywAAEEASARAIBcoAgAQ4QULIAAsAAtBAEgEQCAAKAIAEOEFCyABQfAAaiEAIDIsAABBAEgEQCAWKAIAEOEFCyAALAALQQBIBEAgACgCABDhBQsgAUHUAGohACAqLAAAQQBIBEAgFSgCABDhBQsgACwAC0EASARAIAAoAgAQ4QULIAFBOGohACAMLAAAQQBIBEAgFCgCABDhBQsgACwAC0EASARAIAAoAgAQ4QULIAFBHGohACALLAAAQQBIBEAgEygCABDhBQsgACwAC0EASARAIAAoAgAQ4QULIAosAABBAEgEQCASKAIAEOEFCyAJLAAAQQBIBEAgASgCABDhBQsgAUIANwIAIAFBADYCCCABQQtqIg5BAToAACABQcMAOgAAIAFBAWoiDUEAOgAAIAFBDGoiA0IANwIAIANBADYCCCADQQtqIipBAjoAACADQcPGADsBACADQQJqIjZBADoAACABQRhqIgRCADcCACAEQQA2AgggBEELaiIPQQE6AAAgBEHEADoAACAEQQFqIjdBADoAACABQSRqIgVCADcCACAFQQA2AgggBUELaiIyQQI6AAAgBUHExgA7AQAgBUECaiIbQQA6AAAgAUEwaiIHQgA3AgAg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BCADQc6BATYCCCADQdICNgIMIANB9YIBNgIQIApB6AdB9aIBIAMQoAIaIAhBxKQBNgIAIAggCjYCBEEEIAgQHUGw2QFBzoEBQdICQaSDARAECyACQQBMBEAgBkHoB0GvgQEgDxCgAhogByAGNgIAIAdBrYMBNgIEIAdBzoEBNgIIIAdB0wI2AgwgB0H1ggE2AhAgD0HoB0H1ogEgBxCgAhogBEHEpAE2AgAgBCAPNgIEQQQgBBAdQbDZAUHOgQFB0wJBpIMBEAQLIAFBACAAKAIUIAJsQQJ0EL8GGiAAQdAAaiIdKQMAIAKsfCEuIABB3ABqISAgAEHgAGohFiALQShqISEgBkEoaiEXIAZBGGoiHkELaiEpIAtBFGohIiALQRhqIiNBC2ohKiALQRBqIRggAEEsaiEfIAtBEGoiJEEBaiErIABBIGohECAAQRxqISwgAEE8aiEKIABBOGohCCAAQUBrIQIgAEFAayEHIABBxABqIQwgASEPAkACQAJAAkACQAJAA0ADQCAgKAIAIgEgFigCAEYiAwR+Qv///////////wAFIAEpAygLIi0gHSkDACIvVwRAIAsgASkDADcDACALIAEpAwg3AwggCyABKQMQNwMQICMgAUEYahDnBSAhIAFBKGoiASkDADcDACAhIAEoAgg2AgggFigCACIBICAoAgAiA2siBEE4bSENIARBOEoEQCAGIAMpAwA3AwAgBiADKQMINwMIIAYgAykDEDcDECAeIANBGGoiERDnBSAXIANBKGoiCSkDADcDACAXIAkoAgg2AgggAyABQUhqIgQpAwA3AwAgAyAEKQMINwMIIAMgBCkDEDcDECARIAFBYGoiERDtBRogCSABQXBqIgEpAwA3AwAgCSABKAIINgIIIAQgBikDADcDACAEIAYpAwg3AwggBCAGKQMQNwMQIBEgHhDtBRogASAXKQMANwMAIAEgFygCCDYCCCApLAAAQQBIBEAgHigCABDhBQsgAyANQX9qIAMQiAEgFigCACEBCyABQUhqIQMgAUFgaiIBLAALQQBIBEAgASgCABDhBQsgFiADNgIAIAssAAAiAUFwcSEDIAFB/wFxQe8BSgR/IAEiAwUgAwtB/wFxIQECQAJAAkACQCADQf8BcUGQAUYiBAR/ICIsAAAEfyABBUGAAQsFIAELIgNBgAFrDiEAAQEBAQEBAQEBAQEBAQEBAAEBAQEBAQEBAQEBAQEBAQABCyAYKAIAQYABSQ0BDAILCyAEBEAgIiwAAEUEQEGAASEBCwsCQAJAAkACQAJAAkAgAUGAf2oiAUEEdiABQRx0cg4HAQAEAgUFAwULIB8oAgAgGCgCAEECdGoiASABKAIAQQFqNgIAIAAgCyAAKAIAKAIwQT9xQd0EahEFAAwFCyAfKAIAIBgoAgBBAnRqIgEoAgAiA0EASgRAIAEgA0F/ajYCAAsgACAAKAIAKAJUQf8AcUEDahEHAA0EIBAoAgBBQGstAABBP0oNBCAfKAIAIBgoAgBBAnRqKAIADQQgACALIAAoAgAoAjRBP3FB3QRqEQUADAQLIBAoAgAgJCwAACIBQf8BcWogKywAACIJOgAAAkACQAJAAkACQAJAAkACQAJAIAFBBmsOdgYICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIBwgICAgICAgICAgICAgICAgICAgICAgICAgACAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAUEAwMCAggICAgICAgICAgICAgICAgICAgICAEICyAQKAIAQUBrLQAAQT9KDQsgACAAKAIAKAJIQf8BcUHbAmoRAAAMCwsgACAAKAIAKAJMQf8BcUHbAmoRAAAMCgsgECgCACIBLQBlIgNBgAFxDQ0gAS0AZCIEQYABcQ0NIAggA0EHdCAEcjsBACABQQA6ACYgECgCAEEAOgAGIAguAQBB//8ARw0JIAAgACgCACgCGEH/AXFB2wJqEQAADAkLIBAoAgAiAS0AYyIDQYABcQ0NIAEtAGIiBEGAAXENDSAIIANBB3QgBHJBgIABajsBACABQQA6ACYgECgCAEEAOgAGDAgLAkAgAigCACIBBH8gCC4BACEJIAchBAJAAkACQANAIAlB//8DcSABLgEOIgNB//8DcUgEfyABKAIAIgNFDQIgASEEIAMFIANB//8DcSAJQf//A3FODQQgAUEEaiIEKAIAIgNFDQMgAwshAQwACwALIAEhAwwDCyABIQMgBCEBDAILIAEhAyAEBSACIgMLIQELIAEoAgAiBEUEQEEUEOAFIgQgCC4BADsBDiAEQQA6ABAgBEEAOgARIARBADYCACAEQQA2AgQgBCADNgIIIAEgBDYCACAKKAIAKAIAIgMEfyAKIAM2AgAgASgCAAUgBAshASAHKAIAIAEQbiAMIAwoAgBBAWo2AgALIAQuABAiAUGAgQJxDQ0gAUEHdEGA/wFxIAFB//8DcUEIdnIiAUUNByABQX9qQRB0QRB1Qf//A3EiAUEHdkH/AHEhDSABQf8AcSERAkAgAigCACIBBH8gCC4BACEJIAchBAJAAkACQANAIAlB//8DcSABLgEOIgNB//8DcUgEfyABKAIAIgNFDQIgASEEIAMFIANB//8DcSAJQf//A3FODQQgAUEEaiIEKAIAIgNFDQMgAwshAQwACwALIAEhAwwDCyABIQMgBCEBDAILIAEhAyAEBSACIgMLIQELIAEoAgAiBEUEQEEUEOAFIgQgCC4BADsBDiAEQQA6ABAgBEEAOgARIARBADYCACAEQQA2AgQgBCADNgIIIAEgBDYCACAKKAIAKAIAIgMEfyAKIAM2AgAgASgCAAUgBAshASAHKAIAIAEQbiAMIAwoAgBBAWo2AgALIAQgDToAECAEIBE6ABEgABCKAQwHCwJAIAIoAgAiAQR/IAguAQAhCSAHIQQCQAJAAkADQCAJQf//A3EgAS4BDiIDQf//A3FIBH8gASgCACIDRQ0CIAEhBCADBSADQf//A3EgCUH//wNxTg0EIAFBBGoiBCgCACIDRQ0DIAMLIQEMAAsACyABIQMMAwsgASEDIAQhAQwCCyABIQMgBAUgAiIDCyEBCyABKAIAIgRFBEBBFBDgBSIEIAguAQA7AQ4gBEEAOgAQIARBADoAESAEQQA2AgAgBEEANgIEIAQgAzYCCCABIAQ2AgAgCigCACgCACIDBH8gCiADNgIAIAEoAgAFIAQLIQEgBygCACABEG4gDCAMKAIAQQFqNgIACyAELgAQIgFBgIECcQ0NIAFBB3RBgP8BcSABQf//A3FBCHZyIgFB//8ATg0GIAFBAWpBEHRBEHVB//8DcSIBQQd2Qf8AcSENIAFB/wBxIRECQCACKAIAIgEEfyAILgEAIQkgByEEAkACQAJAA0AgCUH//wNxIAEuAQ4iA0H//wNxSAR/IAEoAgAiA0UNAiABIQQgAwUgA0H//wNxIAlB//8DcU4NBCABQQRqIgQoAgAiA0UNAyADCyEBDAALAAsgASEDDAMLIAEhAyAEIQEMAgsgASEDIAQFIAIiAwshAQsgASgCACIERQRAQRQQ4AUiBCAILgEAOwEOIARBADoAECAEQQA6ABEgBEEANgIAIARBADYCBCAEIAM2AgggASAENgIAIAooAgAoAgAiAwR/IAogAzYCACABKAIABSAECyEBIAcoAgAgARBuIAwgDCgCAEEBajYCAAsgBCANOgAQIAQgEToAESAAEIoBDAYLAkAgAigCACIBBH8gCC4BACENIAchBAJAAkACQANAIA1B//8DcSABLgEOIgNB//8DcUgEfyABKAIAIgNFDQIgASEEIAMFIANB//8DcSANQf//A3FODQQgAUEEaiIEKAIAIgNFDQMgAwshAQwACwALIAEhAwwDCyABIQMgBCEBDAILIAEhAyAEBSACIgMLIQELIAEoAgAiBEUEQEEUEOAFIgQgCC4BADsBDiAEQQA6ABAgBEEAOgARIARBADYCACAEQQA2AgQgBCADNgIIIAEgBDYCACAKKAIAKAIAIgMEfyAKIAM2AgAgASgCAAUgBAshASAHKAIAIAEQbiAMIAwoAgBBAWo2AgALIAQgCToAECAAEIoBDAULAkAgAigCACIBBH8gCC4BACENIAchBAJAAkACQANAIA1B//8DcSABLgEOIgNB//8DcUgEfyABKAIAIgNFDQIgASEEIAMFIANB//8DcSANQf//A3FODQQgAUEEaiIEKAIAIgNFDQMgAwshAQwACwALIAEhAwwDCyABIQMgBCEBDAILIAEhAyAEBSACIgMLIQELIAEoAgAiBEUEQEEUEOAFIgQgCC4BADsBDiAEQQA6ABAgBEEAOgARIARBADYCACAEQQA2AgQgBCADNgIIIAEgBDYCACAKKAIAKAIAIgMEfyAKIAM2AgAgASgCAAUgBAshASAHKAIAIAEQbiAMIAwoAgBBAWo2AgALIAQgCToAESAAEIoBDAQLIAAgASAAKAIAKAI8QT9xQd0EahEFAAwDCyAsICQuAQA7AQAgACAAKAIAKAJQQf8BcUHbAmoRAAAMAgsgACALIAAoAgAoAjhBP3FB3QRqEQUACwsgKiwAAEEASARAICMoAgAQ4QULDAELCyAAIA8gLiADBH5C////////////AAUgASkDKAsiLVMEfiAuBSAtCyAvfaciASAAKAIAKAIsQQ9xQZ0FahEBACAdIB0pAwAgAax8Ii03AwAgDyABQQN0aiEPIC0gLlMNAAsMBAsgBkHo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AyAEQX9qIgQNAAtBwAAgBmsFQQELIQQgAyACNgIEIAUgAigCACILNgIAIAsgBTYCBCACIAM2AgAgByAGIARqNgIACwsCQCACIAAoApgEIgMiC0cEQCAAQRBqIScgAEEUaiEoAkACQAJAAkACQAJAAkACQAJAAkADQCADIhxBCGohGUHoAxDgBSIIQQA2AgQgCEEANgIIIAhB4Cg2AgAgCEEQaiIpIAA2AgAgCEEANgIUIAhBADYCGCAIQRxqIg8gJygCALIiLDgCACAIQSBqIh4gKCgCADYCACAIQTBqIQ4gCEE0aiETIAhBQGsiKkEANgIAIAhB0AFqIitBADYCACAIQSRqIhhCADcCACAYQgA3AgggGEIANwIQIAggLDgC4AIgCEPbD8lAICyVIi04AugCIAhBATYC7AIgCEMAAAAAOALwAiAIQwAAAD84AvQCIAhB+AJqIgNCADcCACADQgA3AgggA0EANgIQIAggLTgC5AIgCEMAAAAAOAKMAyAIQwAAgD84ApADIAhEAAAAAAAAXkA5A5gDIAhBoANqIgNCADcDACADQgA3AwggA0IANwMQIANBADYCGCAIQwAAAAA4AsADIAhDAAAAADgCxAMgCEMAAIA/ICxDCtejPJSVOALIAyAIQwAAAAA4AswDIAhBADoA0AMgCEMAAAAAOALUAyAIQwAAAAA4AtwDIAhDAAAAADgC4AMgCEEsaiERQbADEOAFIgNCADcCACADQgA3AgggA0IANwIQIANCADcCGCADQgA3AiAgA0EANgIoIANBATYCGCADQQA2AhwgA0MAAAAAOAIgIANDAACAPzgCJCADQQE6ACggA0MAAAA/OAIsIANDAAAAADgCMCADQwAAgD84AjQgA0E4aiIEQgA3AgAgBEIANwIIIARCADcCECAEQgA3AhggBEIANwIgIARCADcCKCAEQgA3AjAgBEIANwI4IARBQGtCADcCACAEQgA3AkggA0MAAIA/OAKIASADQwAAAAA4AowBIANBkAFqIgRCADcCACAEQgA3AgggBEIANwIQIARCADcCGCAEQgA3AiAgBEEANgIoIANBATYCqAEgA0EANgKsASADQwAAAAA4ArABIANDAACAPzgCtAEgA0EBOgC4ASADQwAAAD84ArwBIANDAAAAADgCwAEgA0MAAIA/OALEASADQcgBaiIEQgA3AgAgBEIANwIIIARCADcCECAEQgA3AhggBEIANwIgIARCADcCKCAEQgA3AjAgBEIANwI4IARBQGtCADcCACAEQgA3AkggA0MAAIA/OAKYAiADQwAAAAA4ApwCIANBoAJqIgRCADcCACAEQgA3AgggBEIANwIQIARCADcCGCAEQgA3AiAgBEEANgIoIANBATYCuAIgA0EANgK8AiADQwAAAAA4AsACIANDAACAPzgCxAIgA0EBOgDIAiADQwAAAD84AswCIANDAAAAADgC0AIgA0MAAIA/OALUAiADQdgCaiIEQgA3AgAgBEIANwIIIARCADcCECAEQgA3AhggBEIANwIgIARCADcCKCAEQgA3AjAgBEIANwI4IARBQGtCADcCACAEQgA3AkggA0MAAIA/OAKoAyADQwAAAAA4AqwDIANBsANqISIgCEEoaiIMKAIAIgQgGCgCACIJRgR/IAkiBAUDQCADQfB+aiIFIARB8H5qIgcpAgA3AgAgBSAHKAIINgIIIANB/H5qIhVBADYCACADQYB/aiIQQQA2AgAgA0GEf2oiFkEANgIAIARBgH9qIhcoAgAgBEH8fmoiHygCAGsiBUEsbSESIAUEQCASQd3oxS5LDQQgECAFEOAFIgY2AgAgFSAGNgIAIBYgBiASQSxsajYCACAfKAIAIgUgFygCACISRwRAA0AgBiAFKQIANwIAIAYgBSkCCDcCCCAGIAUpAhA3AhAgBiAFKQIYNwIYIAYgBSkCIDcCICAGIAUoAig2AiggECAQKAIAQSxqIgY2AgAgBUEsaiIFIBJHDQALCwsgA0GIf2oiBSAEQYh/aiIGKQIANwIAIAUgBikCCDcCCCAFIAYpAhA3AhAgBSAGKQIYNwIYIAUgBikCIDcCICADQbB/aiIVQQA2AgAgA0G0f2oiEEEANgIAIANBuH9qIhZBADYCACAEQbR/aiIXKAIAIARBsH9qIh8oAgBrIgVBFG0hEiAFBEAgEkHMmbPmAEsNBSAQIAUQ4AUiBjYCACAVIAY2AgAgFiAGIBJBFGxqNgIAIB8oAgAiBSAXKAIAIhJHBEADQCAGIAUpAgA3AgAgBiAFKQIINwIIIAYgBSgCEDYCECAQIBAoAgBBFGoiBjYCACAFQRRqIgUgEkcNAAsLCyADQbx/aiIVQQA2AgAgA0FAaiIQQQA2AgAgA0FEaiIWQQA2AgAgBEFAaiIXKAIAIARBvH9qIh8oAgBrIgVBFG0hEiAFBEAgEkHMmbPmAEsNBiAQIAUQ4AUiBjYCACAVIAY2AgAgFiAGIBJBFGxqNgIAIB8oAgAiBSAXKAIAIhJHBEADQCAGIAUpAgA3AgAgBiAFKQIINwIIIAYgBSgCEDYCECAQIBAoAgBBFGoiBjYCACAFQRRqIgUgEkcNAAsLCyADQUhqIARBSGooAgA2AgAgA0FMaiAEQUxqKAIAIgU2AgAgBQRAIAVBBGoiBSAFKAIAQQFqNgIACyADQVBqIARBUGooAgA2AgAgA0FUaiAEQVRqKAIAIgU2AgAgBQRAIAVBBGoiBSAFKAIAQQFqNgIACyADQVhqIARBWGooAgA2AgAgA0FcaiAEQVxqKAIAIgU2AgAgBQRAIAVBBGoiBSAFKAIAQQFqNgIACyADQWBqIARBYGooAgA2AgAgA0FkaiAEQWRqKAIAIgU2AgAgBQRAIAVBBGoiBSAFKAIAQQFqNgIACyADQWhqIgUgBEFoaiIEKQIANwIAIAUgBCkCCDcCCCAFIAQpAhA3AhAgA0HwfmohAyAHIAlHBEAgByEEDAELCyAYKAIAIQQgDCgCAAshBSAYIAM2AgAgDCAiNgIAIBEgIjYCACAFIAQiBkcEQCAFIQMDQCADQfB+aiEFIANBZGooAgAiAwRAIANBBGoiCSgCACEHIAkgB0F/ajYCACAHRQRAIAMgAygCACgCCEH/AXFB2wJqEQAAIAMQ2wULCyAFEKsBIAUgBkcEQCAFIQMMAQsLCyAEBEAgBBDhBQsgDCgCACAYKAIAIgNHBEBBACEEA0AgHigCACIFQX9qQQJPDQsgAyAEQZABbGogDygCADYCACADIARBkAFsaiAFNgIEIAMgBEGQAWxqIA8qAgBDAAAAP5Q4AgggDyoCAEMK1yM8lCEsQSAQ4AUiBUEANgIEIAVBADYCCCAFQfwoNgIAIAVBDGoiBkMAAAAAOAIAIAVDAAAAADgCECAFQwAAgD8gLJU4AhQgBUMAAAAAOAIYIAVBADoAHCADIARBkAFsakHoAGoiByAGNgIAIAMgBEGQAWxqQewAaiIJKAIAIQYgCSAFNgIAIAYEQCAGQQRqIgkoAgAhBSAJIAVBf2o2AgAgBUUEQCAGIAYoAgAoAghB/wFxQdsCahEAACAGENsFCwsgDyoCAEMK1yM8lCEsQSAQ4AUiBUEANgIEIAVBADYCCCAFQfwoNgIAIAVBDGoiBkMAAAAAOAIAIAVDAAAAADgCECAFQwAAgD8gLJU4AhQgBUMAAAAAOAIYIAVBADoAHCADIARBkAFsakHYAGoiCSAGNgIAIAMgBEGQAWxqQdwAaiIQKAIAIQYgECAFNgIAAkAgBgRAIAZBBGoiECgCACEFIBAgBUF/ajYCACAFDQEgBiAGKAIAKAIIQf8BcUHbAmoRAAAgBhDbBQsLIA8qAgBDCtcjPJQhLEEgEOAFIgVBADYCBCAFQQA2AgggBUH8KDYCACAFQQxqIgZDAAAAADgCACAFQwAAAAA4AhAgBUMAAIA/ICyVOAIUIAVDAAAAADgCGCAFQQA6ABwgAyAEQZABbGpB4ABqIhAgBjYCACADIARBkAFsakHkAGoiBigCACEDIAYgBTYCAAJAIAMEQCADQQRqIgYoAgAhBSAGIAVBf2o2AgAgBQ0BIAMgAygCACgCCEH/AXFB2wJqEQAAIAMQ2wULCyAJKAIAIQUgECgCACEGIAwoAgAhCSAYKAIAIQMgBygCACIHQYCAgPwDNgIAIAdBgICA/AM2AgQgBUHzidT5AzYCACAFQfOJ1PkDNgIEIAZB84nU+QM2AgAgBkHzidT5AzYCBCAEQQFqIgQgCSADa0GQAW1JDQALCyATKAIAIgQgDigCACIFayIJQdwBbSEHIAUhBiAEIQMgB0ECSQRAAkAgCEE4aiIQKAIAIgYgBGtB3AFtQQIgB2siBEkEQCAGIAVrIgVB3AFtIgNBieTTBEkhBiADQQF0IQMgBUUEQEECIQMLIAYEfyADBUGSyKcJIgMLBH8gA0GSyKcJSw0IIANB3AFsEOAFBUEACyIGIANB3AFsaiEiIAQhAyAGIAdB3AFsaiIFIQQDQCAEQQRqQQBByAEQvwYaIARBADYCMCAEQQA2AjQgBEEANgI4IARBQGtBADYCACAEQQA2AkQgBEEANgJIIARBADYCUCAEQQA2AlQgBEEANgJYIARBADYCYCAEQQA2AmQgBEEANgJoIARBmCk2AgAgBEMAAAAAOAKcASAEQQA6AKABIARDAAAAADgCpAEgBEMAAAAAOAKoASAEQwAAAAA4ArABIARBADoAtAEgBEMAAAAAOAK4ASAEQwAAAAA4ArwBIARDAAAAADgCxAEgBEEAOgDIASAEQYgBaiIHQgA3AgAgB0IANwIIIARBzAFqIgdCADcCACAHQgA3AgggBEHcAWohBCADQX9qIgMNAAsgBkG4A2ohEiATKAIAIgQgDigCACIGRgR/IAUhAyAGIgQFIAUhAwNAIARBpH5qIQUgA0GkfmoiGEHMKjYCACADQah+aiIHIARBqH5qIgkpAgA3AgAgByAJKQIINwIIIAcgCSkCEDcCECAHIAkpAhg3AhggByAJKQIgNwIgIBhB/Co2AgAgA0HQfmogBEHQfmooAgA2AgAgA0HUfmoiEUEANgIAIANB2H5qIglBADYCACADQdx+aiIVQQA2AgAgBEHYfmoiFigCACAEQdR+aiIXKAIAayIHQQJ1IQwCQCAHBEAgDEH/////A0sNDCAJIAcQ4AUiBzYCACARIAc2AgAgFSAHIAxBAnRqNgIAIBYoAgAgFygCACIRayIMQQBMDQEgByARIAwQvQYaIAkgByAMQQJ2QQJ0ajYCAAsLIANB4H5qIARB4H5qKAIANgIAIANB5H5qIhFBADYCACADQeh+aiIJQQA2AgAgA0HsfmoiFUEANgIAIARB6H5qIhYoAgAgBEHkfmoiFygCAGsiB0ECdSEMAkAgBwRAIAxB/////wNLDQ0gCSAHEOAFIgc2AgAgESAHNgIAIBUgByAMQQJ0ajYCACAWKAIAIBcoAgAiEWsiDEEATA0BIAcgESAMEL0GGiAJIAcgDEECdkECdGo2AgALCyADQfB+aiAEQfB+aigCADYCACADQfR+aiIRQQA2AgAgA0H4fmoiCUEANgIAIANB/H5qIhVBADYCACAEQfh+aiIWKAIAIARB9H5qIhcoAgBrIgdBAnUhDAJAIAcEQCAMQf////8DSw0OIAkgBxDgBSIHNgIAIBEgBzYCACAVIAcgDEECdGo2AgAgFigCACAXKAIAIhFrIgxBAEwNASAHIBEgDBC9BhogCSAHIAxBAnZBAnRqNgIACwsgA0GAf2ogBEGAf2ooAgA2AgAgA0GEf2oiEUEANgIAIANBiH9qIglBADYCACADQYx/aiIVQQA2AgAgBEGIf2oiFigCACAEQYR/aiIXKAIAayIHQQJ1IQwCQCAHBEAgDEH/////A0sNDyAJIAcQ4AUiBzYCACARIAc2AgAgFSAHIAxBAnRqNgIAIBYoAgAgFygCACIRayIMQQBMDQEgByARIAwQvQYaIAkgByAMQQJ2QQJ0ajYCAAsLIANBkH9qIgcgBEGQf2oiCSkCADcCACAHIAkpAgg3AgggByAJKQIQNwIQIAcgCSgCGDYCGCAYQZgpNgIAIANBrH9qIARBrH9qKAIANgIAIANBsH9qIARBsH9qKAIAIgc2AgAgBwRAIAdBBGoiByAHKAIAQQFqNgIACyADQbR/aiIHIARBtH9qIgQpAgA3AgAgByAEKQIINwIIIAcgBCkCEDcCECAHIAQpAhg3AhggByAEKQIgNwIgIAcgBCkCKDcCKCAHIAQpAjA3AjAgByAEKQI4NwI4IAdBQGsgBEFAaykCADcCACAHIAQoAkg2AkggA0GkfmohAyAFIAZHBEAgBSEEDAELCyAOKAIAIQQgEygCAAshBSAOIAM2AgAgEyASNgIAIBAgIjYCACAFIAQiBkcEQCAFIQMDQCADQaR+aiIDIAMoAgAoAgBB/wFxQdsCahEAACADIAZHDQALCyAERQ0BIAQQ4QUFA0AgA0EEakEAQcgBEL8GGiADQQA2AjAgA0EANgI0IANBADYCOCADQUBrQQA2AgAgA0EANgJEIANBADYCSCADQQA2AlAgA0EANgJUIANBADYCWCADQQA2AmAgA0EANgJkIANBADYCaCADQZgpNgIAIANDAAAAADgCnAEgA0EAOgCgASADQwAAAAA4AqQBIANDAAAAADgCqAEgA0MAAAAAOAKwASADQQA6ALQBIANDAAAAADgCuAEgA0MAAAAAOAK8ASADQwAAAAA4AsQBIANBADoAyAEgA0GIAWoiBUIANwIAIAVCADcCCCADQcwBaiIDQgA3AgAgA0IANwIIIBMgEygCAEHcAWoiAzYCACAEQX9qIgQNAAsLCyATKAIAIQQFIAlBuANHBEAgBkG4A2oiBCADRwRAA0AgA0GkfmoiAyADKAIAKAIAQf8BcUHbAmoRAAAgAyAERw0ACwsgEyAENgIACwsgBCAOKAIAIgNHBEBBACEEA0AgAyAEQdwBbGogDyAeEM8BIA4oAgAiAyAEQdwBbGpBkAFqIQUgDyoCAEOPwnU8lCIsQwAAAABeBH8gAyAEQdwBbGpDAACAPyAslSIsOAKYASAsIAMgBEHcAWxqKgKUASAFKgIAk5QhLEEABSAFIAMgBEHcAWxqKAKUATYCAEMAAAAAISxBAQshBiADIARB3AFsaiAsOAKcASADIARB3AFsaiAGOgCgASAOKAIAIgMgBEHcAWxqQaQBaiEFIA8qAgBDCtcjPJQiLEMAAAAAXgR/IAMgBEHcAWxqQwAAgD8gLJUiLDgCrAEgLCADIARB3AFsaioCqAEgBSoCAJOUISxBAAUgBSADIARB3AFsaigCqAE2AgBDAAAAACEsQQELIQYgAyAEQdwBbGogLDgCsAEgAyAEQdwBbGogBjoAtAEgDigCACIDIARB3AFsakG4AWohBSAPKgIAQwrXozyUIixDAAAAAF4EfyADIARB3AFsakMAAIA/ICyVIiw4AsABICwgAyAEQdwBbGoqArwBIAUqAgCTlCEsQQAFIAUgAyAEQdwBbGooArwBNgIAQwAAAAAhLEEBCyEGIAMgBEHcAWxqICw4AsQBIAMgBEHcAWxqIAY6AMgBIARBAWoiBCATKAIAIA4oAgAiA2tB3AFtSQ0ACwsgKiAPKgIAEKoBIA4oAgBB3AFqIA8gHhDPASArIA8qAgAQqgEgGSApNgIAIBxBDGoiBCgCACEDIAQgCDYCACADBEAgA0EEaiIFKAIAIQQgBSAEQX9qNgIAIARFBEAgAyADKAIAKAIIQf8BcUHbAmoRAAAgAxDbBQsLIBooAgAiAygCACEEIBkoAgAoAhQiBUHwAGohBiADKAIEIgMhByADBEAgA0EEaiIDIAMoAgBBAWo2AgALIAYgBDYCACAFQfQAaiIEKAIAIQMgBCAHNgIAAkAgAwRAIANBBGoiBSgCACEEIAUgBEF/ajYCACAEDQEgAyADKAIAKAIIQf8BcUHbAmoRAAAgAxDbBQsLIBkoAgAoAhQiBEGAAmohBSAaKAIAIgMoAgghBiADKAIMIgMhByADBEAgA0EEaiIDIAMoAgBBAWo2AgALIAUgBjYCACAEQYQCaiIEKAIAIQMgBCAHNgIAAkAgAwRAIANBBGoiBSgCACEEIAUgBEF/ajYCACAEDQEgAyADKAIAKAIIQf8BcUHbAmoRAAAgAxDbBQsLIBkoAgAoAhQiBEGQA2ohBSAaKAIAIgMoAhAhBiADKAIUIgMhByADBEAgA0EEaiIDIAMoAgBBAWo2AgALIAUgBjYCACAEQZQDaiIEKAIAIQMgBCAHNgIAAkAgAwRAIANBBGoiBSgCACEEIAUgBEF/ajYCACAEDQEgAyADKAIAKAIIQf8BcUHbAmoRAAAgAxDbBQsLIBkoAgAoAiAiBEGIAWohBSAUKAIAIgMoAgAhBiADKAIEIgMhByADBEAgA0EEaiIDIAMoAgBBAWo2AgALIAUgBjYCACAEQYwBaiIEKAIAIQMgBCAHNgIAAkAgAwRAIANBBGoiBSgCACEEIAUgBEF/ajYCACAEDQEgAyADKAIAKAIIQf8BcUHbAmoRAAAgAxDbBQsLIBkoAgAoAiAiBEHkAmohBSAUKAIAIgMoAgghBiADKAIMIgMhByADBEAgA0EEaiIDIAMoAgBBAWo2AgALIAUgBjYCACAEQegCaiIEKAIAIQMgBCAHNgIAAkAgAwRAIANBBGoiBSgCACEEIAUgBEF/ajYCACAEDQEgAyADKAIAKAIIQf8BcUHbAmoRAAAgAxDbBQsLIBkoAgAiBEGUA2ohBSAlKAIAIQYgICgCACIDIQcgAwRAIANBBGoiAyADKAIAQQFqNgIACyAFIAY2AgAgBEGYA2oiBCgCACEDIAQgBzYCAAJAIAMEQCADQQRqIgUoAgAhBCAFIARBf2o2AgAgBA0BIAMgAygCACgCCEH/AXFB2wJqEQAAIAMQ2wULCyAZKAIAIgRBBGohBSAmKAIAIQYgISgCACIDIQcgAwRAIANBBGoiAyADKAIAQQFqNgIACyAFIAY2AgAgBEEIaiIEKAIAIQMgBCAHNgIAAkAgAwRAIANBBGoiBSgCACEEIAUgBEF/ajYCACAEDQEgAyADKAIAKAIIQf8BcUHbAmoRAAAgAxDbBQsLIAIgCygCBCIDIgtHDQALDAsLEKwEDAgLEKwEDAcLEKwEDAYLQQgQBSICQaWIARDkBSACQfDkADYCACACQZgZQZEBEAcMBQsQrAQMBAsQrAQMAwsQrAQMAgsQrAQMAQsgCkHoB0HviQEgJBCgAhogHSAKNgIAIB1Bm4oBNgIEIB1B44QBNgIIIB1B9AI2AgwgHUG0igE2AhAgJEHoB0H1ogEgHRCgAhogI0HEpAE2AgAgIyAkNgIEQQQgIxAdQbDZAUHjhAFB9AJBx6QBEAQLCwtBJBDgBSICQQA2AgQgAkEANgIIIAJBxCg2AgAgAkEMaiIDQwAAAAA4AgAgAkG0gN7NAzYCECACQwAAsEA4AhQgAkOMLjo+OAIYIAJDABSoPTgCHCACQ/v0QkE4AiAgACADNgKsBCAAQbAEaiIEKAIAIQMgBCACNgIAIAMEQCADQQRqIgQoAgAhAiAEIAJBf2o2AgAgAkUEQCADIAMoAgAoAghB/wFxQdsCahEAACADENsFCwtBJBDgBSICQQA2AgQgAkEANgIIIAJBxCg2AgAgAkEMaiIDQwAAAAA4AgAgAkMAAAAAOAIQIAJDAACAQDgCFCACQwAAgD44AhggAkNS15g8OAIcIAJDgmRWQjgCICAAIAM2ArQEIABBuARqIgQoAgAhAyAEIAI2AgAgAwRAIANBBGoiBCgCACECIAQgAkF/ajYCACACRQRAIAMgAygCACgCCEH/AXFB2wJqEQAAIAMQ2wULC0EkEOAFIgJBADYCBCACQQA2AgggAkHEKDYCACACQQxqIgNDAAAAADgCACACQYCAgIkENgIQIAJDAADgQDgCFCACQyVJEj44AhggAkNSQ5lBOAIcIAJDbs1VPTgCICAAIAM2ArwEIABBwARqIgQoAgAhAyAEIAI2AgAgAwRAIANBBGoiBCgCACECIAQgAkF/ajYCACACRQRAIAMgAygCACgCCEH/AXFB2wJqEQAAIAMQ2wULC0EkEOAFIgJBADYCBCACQQA2AgggAkHEKDYCACACQQxqIgNDAAAAADgCACACQQA2AhAgAkMAAIBAOAIUIAJDAACAPjgCGCACQycNPz44AhwgAkOag6tAOAIgIAAgAzYCxAQgAEHIBGoiBCgCACEDIAQgAjYCACADBEAgA0EEaiIEKAIAIQIgBCACQX9qNgIAIAJFBEAgAyADKAIAKAIIQf8BcUHbAmoRAAAgAxDbBQsLQSQQ4AUiAkEANgIEIAJBADYCCCACQcQoNgIAIAJBDGoiA0MAAAAAOAIAIAJBADYCECACQwAAgEA4AhQgAkMAAIA+OAIYIAJDJw0/PjgCHCACQ5qDq0A4AiAgACADNgLMBCAAQdAEaiIEKAIAIQMgBCACNgIAIAMEQCADQQRqIgQoAgAhAiAEIAJBf2o2AgAgAkUEQCADIAMoAgAoAghB/wFxQdsCahEAACADENsFCwtBJBDgBSICQQA2AgQgAkEANgIIIAJBxCg2AgAgAkEMaiIDQwAAAAA4AgAgAkMAAAAAOAIQIAJDAACgQDgCFCACQ83MTD44AhggAkMRt6Y8OAIcIAJDBo1EQjgCICAAIAM2AtQEIABB2ARqIgQoAgAhAyAEIAI2AgAgAwRAIANBBGoiBCgCACECIAQgAkF/ajYCACACRQRAIAMgAygCACgCCEH/AXFB2wJqEQAAIAMQ2wULCyAAQYgBaiABsiIsEKoBIABBmAJqICwQqgEgCkEKOgALIApBv4kBKQAANwAAIApBx4kBLgAAOwAIIApBADoACiANQgA3AgAgDUEANgIIIA1BC2oiAUEBOgAAIA1BMToAACANQQA6AAEgAEHsAGoiAhDdBSAAIAoQoAEgDRCWASACEN4FIAEsAABBAEgEQCANKAIAEOEFC0EgEOAFIgFByokBKQAANwAAIAFB0okBKQAANwAIIAFB2okBLAAAOgAQIAFBADoAESAKQgA3AgAgCkEANgIIIApBC2oiA0EEOgAAIApBsNzAiQM2AgAgCkEAOgAEIAIQ3QUgACABEKABIAoQlgEgAhDeBSADLAAAQQBIBEAgCigCABDhBQsgARDhBUEgEOAFIgFB3IkBKQAANwAAIAFB5IkBKQAANwAIIAFB7IkBLgAAOwAQIAFBADoAEiAKQgA3AgAgCkEANgIIIApBC2oiA0EBOgAAIApBMDoAACAKQQA6AAEgAhDdBSAAIAEQoAEgChCWASACEN4FIAMsAABBAE4EQCABEOEFIBskBw8LIAooAgAQ4QUgARDhBSAbJAcLqCECKn8HfSMHIRMjB0EgaiQHIBMiDUEQaiEKIA1BCGohCSAAQagEaiIaKAIARQRAIAAoAvgDIgQgACkDUDcDGCAEIAQoAhA2AiALIABB7ABqIhsQ3QUgAEGgBGoiIiAAKAKkBCIEIgtGBEAgGxDeBSATJAcPCyAAQZQEaiEUIABBnARqIRwgAkEASiEjIAlBBGohEiAEIQADQCAAKAIIIQQgACgCDCIMRSIdRQRAIAxBBGoiAyADKAIAQQFqNgIACyAEIgcoAjAEfyAHQSBqIhUoAgAiACgCiAEsABgEf0EBBSAAKALkAiwAGEEARwshFiAjBEAgB0EwaiEkIAdBzANqISUgB0HQA2ohFyAHQcQDaiEOIAdByANqISYgB0GwA2ohDyAHQbQDaiEnIAdBJGohGCAHQbwDaiEoIAdBFGohHiAHQRhqIR8gFkEBcyEpIAdBEGohECAHQQRqISAgASEAQQAhIQNAICQQqAEgJSoCAJQhMyAXKgIAIi5DAAAAAFwEQCAOIC4gDioCAJIiLzgCACAmKAIAsiEtIC5DAAAAAF4EQCAvIC1eBEAgDiAtOAIAIBdDAAAAADgCAAsFIC8gLV0EQCAOIC04AgAgF0MAAAAAOAIACwsgFSgCACIEIQUgGCgCACIDIARHBEAgAyAEa0HcAW0hBkEAIQMDQCAFIANB3AFsaigCiAEiBCoCFCItQwAAAABcBEAgBCoCCCAOKgIAIC2UQ6uqqj2UuxAgtpQhLSAFIANB3AFsakGQAWohBCAFIANB3AFsaiwAoAEEQCAFIANB3AFsaioCnAEiL0MAAAAAWwR9IAQgLTgCACAtBSAEKgIACyEuBSAFIANB3AFsaiAFIANB3AFsaioCmAEgLSAEKgIAIi6Ti5QiLzgCnAELIAUgA0HcAWxqIC04ApQBAkAgLiAtXARAIC4gLV0EQCAEIC4gL5IiLjgCACAuIC1eRQRAIC4hLQwDCyAEIC04AgAFIAQgLiAvkyIuOAIAIC4gLV1FBEAgLiEtDAMLIAQgLTgCAAsFIC4hLQsLIAUgA0HcAWxqIC04AswBCyADQQFqIgMgBkkNAAsLCwJAIA8qAgAiLiAnKgIAIi1cBEAgKCoCACEvIC4gLV0EQCAPIC4gL5IiLjgCACAuIC1eRQRAIC4hLQwDCyAPIC04AgAFIA8gLiAvkyIuOAIAIC4gLV1FBEAgLiEtDAMLIA8gLTgCAAsFIC4hLQsLIB4oAgAiBCAfKAIAIgVHBEADQCAEKAJwIgMoAgQEQCAEIC0gDioCACADKgKQAZKSOAJ4IAQgAygCIDYCfCAEIAMoAiQ2AoABCyAEQZABaiIEIAVHDQALCyAWBEAgFSgCACIEIBgoAgAiBUcEQANAIAQoAogBLAAYBEACQCAEQZABaiIDKgIAIi4gBCoClAEiLVwEQCAEKgKcASEvIC4gLV0EQCADIC4gL5IiLjgCACAuIC1eRQRAIC4hLQwDCyADIC04AgAFIAMgLiAvkyIuOAIAIC4gLV1FBEAgLiEtDAMLIAMgLTgCAAsFIC4hLQsLIAQgLTgCzAECQCAEQaQBaiIDKgIAIi4gBCoCqAEiLVwEQCAEKgKwASEvIC4gLV0EQCADIC4gL5IiLjgCACAuIC1eRQRAIC4hLQwDCyADIC04AgAFIAMgLiAvkyIuOAIAIC4gLV1FBEAgLiEtDAMLIAMgLTgCAAsFIC4hLQsLIAQgLTgC0AELIARB3AFqIgQgBUcNAAsLCyAHEKYBIA1CADcDACAKQgA3AgAgCkIANwIIIB4oAgAiBCAfKAIAIghHBEADQCAEQfAAaiIRKAIAKAIEBEAgBCoCeCIuIARBhAFqIgYqAgBcBEAgBEE8aiIZIC5DAACKwpJDq6qqPZS7ECC2QwAA3EOUIi8gBCoCCCItXgR9IC0FIC8iLQs4AgACQCAEKAIMIgMgBCgCECIFRwRAIAMgLTgCECADIC0gAyoCBJQ4AiggA0EsaiIDIAVGDQEDQCADIBkqAgAiLTgCECADIC0gAyoCBJQ4AiggA0EsaiIDIAVHDQALCwsgBiAuOAIACyAEKgJ8Ii0gBEGIAWoiBSoCAFwEQCAtQwAAAABdBH1DAAAAAAUgLQshLgJAIAQoAmgiAywAEARAIAMqAgxDAAAAAFwNASADIC44AgAFIAMgAyoCCCAuIAMqAgCTi5Q4AgwLCyADIC44AgQgBSAtOAIACyAEQYABaiIDKgIAIi0gBEGMAWoiBSoCAFwEQCAEIC0QmAEgBSADKAIANgIACwJAIAQoAmgiAyoCACIuIAMqAgQiLVwEQCADKgIMIS8gLiAtXQRAIAMgLiAvkiIuOAIAIC4gLV5FBEAgLiEtDAMLIAMgLTgCAAUgAyAuIC+TIi44AgAgLiAtXUUEQCAuIS0MAwsgAyAtOAIACwUgLiEtCwsgLSAEKgIklCEyIAQoAgRBAUYhAyAJQwAAAAA4AgACQCADBEAgMkPzBLU+lCEuIAQoAgwiAyAEKAIQIgVGBEBDAAAAACEtDAILA0AgLiADEKkBlCEtIAkgCSoCACAtkiItOAIAIANBLGoiAyAFRw0ACwUgEkMAAAAAOAIAIARBEGoiGSgCACAEQQxqIiooAgAiA0YEQEMAAAAAIS9DAAAAACExBSAEQUBrISsgBEHMAGohLEEAIQUDQCADIAVBLGxqEKkBITECQCArKAIAIgYgBUEUbGoiAyoCACIuIAYgBUEUbGoqAgQiLVwEQCAGIAVBFGxqKgIMIS8gLiAtXQRAIAMgLiAvkiIuOAIAIC4gLV5FBEAgLiEtDAMLIAMgLTgCAAUgAyAuIC+TIi44AgAgLiAtXUUEQCAuIS0MAwsgAyAtOAIACwUgLiEtCwsgCSAJKgIAIDEgLZSSIi84AgACQCAsKAIAIgYgBUEUbGoiAyoCACIuIAYgBUEUbGoqAgQiLVwEQCAGIAVBFGxqKgIMITAgLiAtXQRAIAMgLiAwkiIuOAIAIC4gLV5FBEAgLiEtDAMLIAMgLTgCAAUgAyAuIDCTIi44AgAgLiAtXUUEQCAuIS0MAwsgAyAtOAIACwUgLiEtCwsgEiASKgIAIDEgLZSSIjE4AgAgBUEBaiIFIBkoAgAgKigCACIDa0EsbUkNAAsLAkAgBCgCWCIDKgIAIi4gAyoCBCItXARAIAMqAgwhMCAuIC1dBEAgAyAuIDCSIi44AgAgLiAtXkUEQCAuIS0MAwsgAyAtOAIABSADIC4gMJMiLjgCACAuIC1dRQRAIC4hLQwDCyADIC04AgALBSAuIS0LCyAJIC8gMiAtlJQiLzgCAAJAIAQoAmAiAyoCACIuIAMqAgQiLVwEQCADKgIMITAgLiAtXQRAIAMgLiAwkiIuOAIAIC4gLV5FBEAgLiEtDAMLIAMgLTgCAAUgAyAuIDCTIi44AgAgLiAtXUUEQCAuIS0MAwsgAyAtOAIACwUgLiEtCwsgEiAxIDIgLZSUOAIAIC8hLQsLAkAgESgCACIGLAAoRSApcgRAIBAoAgAiA0EATA0BIANBf2ohBkEAIQMDQCANIANBAnRqIgUgLSAFKgIAkjgCACADQQFqIQUgAyAGRg0CIAkgBSIDQQJ0aioCACEtDAALAAUgECgCACIDQQBKIQUgICgCACgCEARAIAVFDQJDAACAPyAGKgIsIi6TIS8gA0F/aiEGQQAhAwNAIAogA0ECdGoiBSAFKgIAIC0gLpSSOAIAIAogA0ECakECdGoiBSAFKgIAIC0gL5SSOAIAIANBAWohBSADIAZGDQMgCSAFIgNBAnRqKgIAIS0MAAsABSAFRQ0CIANBf2ohBkEAIQMDQCAKIANBAnRqIgUgLSAFKgIAkjgCACADQQFqIQUgAyAGRg0DIAkgBSIDQQJ0aioCACEtDAALAAsACwALCyAEQZABaiIEIAhHDQALCwJAAkAgFkUNACAVKAIAIgQgGCgCACIFRgRAIAQhBQUgBCEDA0AgAygCiAEiESwAGARAIAMqAswBIi4gA0HUAWoiBioCAFwEQCAuIAMqAhwiLV1FBEAgLiADKgIYIi1eRQRAIC4hLQsLIANBFGoiCCoCACAtXARAIAggLTgCACADQwAAgD8gLUPbD0lAlCADKgIMlBDNAiItQwAAgD+SlSIvOAJ8IAMgLSAvlCItOAJsIAMgLSAtlCIvOAJwIAMgLSAvlCIvOAJ0IAMgLSAvlCIvOAJ4IAMgLTgCLCADIC04AjwgAyAtOAJMIAMgLTgCXCADQwAAgD8gLyADKgKEAZRDAACAP5KVOAKAAQsgBiAuOAIACyADKgLQASIuIANB2AFqIgYqAgBcBEAgA0GEAWoiCCoCAAJ9IC5DAAAAAF0EfUMAAAAABUMAACBBIC5DAAAgQV4NARogLgsLIi1cBEAgCCAtOAIAIANDAACAPyAtIAMqAniUQwAAgD+SlTgCgAELIAYgLjgCAAsgA0G4AWoiBioCACIuIAMqArwBIi1cIQggESwAGQRAAkAgCARAIAMqAsQBIS8gLiAtXQRAIAYgLiAvkiIuOAIAIC4gLV5FBEAgLiEtDAMLIAYgLTgCAAUgBiAuIC+TIi44AgAgLiAtXUUEQCAuIS0MAwsgBiAtOAIACwUgLiEtCwsgAyAzIC2UQwAAgD+SOAIoBQJAIAgEQCADKgLEASEvIC4gLV0EQCAGIC4gL5IiLjgCACAuIC1eRQRAIC4hLQwDCyAGIC04AgAFIAYgLiAvkyIuOAIAIC4gLV1FBEAgLiEtDAMLIAYgLTgCAAsFIC4hLQsLIAMgLUMAAIA/kjgCKAsLIANB3AFqIgMgBUcNAAsLIAQgBUYhAyAgKAIAKAIQBEAgAw0BIAohAwNAIAQoAogBLAAYBEAgBCADIAMQ0AELIBAoAgAiCEEASgRAQQAhBgNAIA0gBkECdGoiESADIAZBAnRqKgIAIBEqAgCSOAIAIAZBAWoiBiAIRw0ACwsgAyAIQQJ0aiEDIARB3AFqIgQgBUcNAAsFIANFBEADQCAEKAKIASwAGARAIAQgCiAKENABCyAEQdwBaiIEIAVHDQALCyAQKAIAIgNBAEwNAkEAIQQDQCANIARBAnRqIgUgCiAEQQJ0aioCACAFKgIAkjgCACAEQQFqIgQgA0cNAAsLCyAQKAIAIgZBAEoEQEEAIQMgACEEA0AgBEEEaiEFIAQgBCoCACAzIA0gA0ECdGoqAgCUkjgCACADQQFqIgMgBkcEQCAFIQQMAQsLIAAgBkECdGohAAsLICFBAWoiISACRw0ACwsgCygCBAVBEBDgBSIDQQA2AgAgAyAENgIIIAMgDDYCDCAdRQRAIAxBBGoiBCAEKAIAQQFqNgIACyADIBQ2AgQgAyAUKAIAIgQ2AgAgBCADNgIEIBQgAzYCACAcIBwoAgBBAWo2AgAgCygCACIDIAtBBGoiBSgCACIENgIEIAUoAgAgAzYCACAaIBooAgBBf2o2AgAgCygCDCIDBEAgA0EEaiIFKAIAIQsgBSALQX9qNgIAIAtFBEAgAyADKAIAKAIIQf8BcUHbAmoRAAAgAxDbBQsLIAAQ4QUgBAshACAdRQRAIAxBBGoiAygCACEEIAMgBEF/ajYCACAERQRAIAwgDCgCACgCCEH/AXFB2wJqEQAAIAwQ2wULCyAiIAAiC0cNAAsgGxDeBSATJAcLlCUCKH8FfSMHIRAjB0EgaiQHIBBBGGohBCAQIghBHGohFyABQRBqIgooAgAhBiABQRRqIhwsAAAhHSAAQYAEaiIMKAIALAAMBEAgACgCqAQEQCAAQaQEaiIUKAIAIABBoARqIgNHBEAgAEGIBGohBSAAQZAEaiEJIAayIS1BASEBA0AgAygCACICKAIIIQcgAigCDCICRSILRQRAIAJBBGoiDSANKAIAQQFqNgIACwJAIAdBMGoiDSgCACIOBEAgAUEBcUUgDkEBckEFRnIEQCAHIAcrAzggB0FAaysDAEQAAABA4XqEP6KjOQO4ASANQQU2AgAMAgsgB0HIA2oiDSgCACEOQQwQ4AUiASAONgIIIAEgBTYCBCABIAUoAgAiDjYCACAOIAE2AgQgBSABNgIAIAkgCSgCAEEBajYCACANIAY2AgAgB0HEA2ohASAHKAIEKgIIIipDAAAAAFwEQCAHIC0gASoCAJMgKiAHKgIMlJU4AtADQQAhAQwCCyABIC04AgAgBygCICIHKAKIASIBKgIIIAEqAhQgLZRDq6qqPZS7ECC2lCEqIAdBkAFqIQEgBywAoAEEQCAHKgKcASIsQwAAAABbBH0gASAqOAIAICoFIAEqAgALISsFIAcgByoCmAEgKiABKgIAIiuTi5QiLDgCnAELIAcgKjgClAECQCArICpcBEAgKyAqXQRAIAEgKyAskiIrOAIAICsgKl5FBEAgKyEqDAMLIAEgKjgCAAUgASArICyTIis4AgAgKyAqXUUEQCArISoMAwsgASAqOAIACwUgKyEqCwsgByAqOALMAUEAIQELCyALRQRAIAJBBGoiCygCACEHIAsgB0F/ajYCACAHRQRAIAIgAigCACgCCEH/AXFB2wJqEQAAIAIQ2wULCyAUKAIAIAMoAgAiA0cNAAsgAUEBcUUEQCAQJAcPCwsLCyAAQZQEaiECIABBnARqIgUoAgAiA0UEQCAEQemIATYCAEEBIAQQHSAQJAcPCyACKAIAIgEoAgghByABKAIMIg1FIhhFBEAgDUEEaiIBIAEoAgBBAWo2AgAgAigCACEBIAUoAgAhAwsgASgCACICIAFBBGoiBCgCADYCBCAEKAIAIAI2AgAgBSADQX9qNgIAIAEoAgwiAwRAIANBBGoiBSgCACECIAUgAkF/ajYCACACRQRAIAMgAygCACgCCEH/AXFB2wJqEQAAIAMQ2wULCyABEOEFIABBoARqIQ4gAEGoBGoiGSgCAARAIA4oAgAoAggoAsgDIQYLIAwoAgAgBjYCGCAHIgZByANqIhogCigCADYCACAGQQRqIhUoAgAsABQEfyAGQcABaiAGKAIAIgFBmAJqQZABEL0GGiAGIRQgBwUgBiEUIAcoAgAhASAHCyEDIAggASkDUDcDACAGQdACaiIFIBUgCBClASADKAIAIgEqAhggAS4BHLJDAAAAxpKUQwAAADmUIS0gBkEUaiIEKAIAIgEgBkEYaiIJKAIAIgpHBEAgBioCxAMhKgNAIAEgLSAqIAEoAnAiAioCkAGSkjgCeCABIAIoAiA2AnwgASACKAIkNgKAASABQZABaiIBIApHDQALCyAGQSBqIh4oAgAiASAGQSRqIh8oAgAiCkcEQCAGQcQDaiEMA0AgASABKAKIASICKgIIIAwqAgAgAioCFJRDq6qqPZS7ECC2lDgCzAEgASACKAIMNgLQASABQdwBaiIBIApHDQALCyAGQcABaiIbQQE2AgAgBhCmASAIIAMoAgApA1A3AwAgBSAVIAgQpQEgBkQAAAAAAAAAADkDyAEgG0EANgIAAkAgBCgCACIFIAkoAgAiIEcEQCAIQQRqISEgCEEIaiEiIAhBDGohIyAIQRBqISQgCEEEaiElIAhBCGohJiAIQQxqIScgCEEQaiEoAkACQAJAA0AgBUMAAAAAOAKEASAFQfAAaiIRKAIAIgRBBGoiAygCACEBQ9sPyUAgBSgCACISviIqlSErIAhCADcDACAIQgA3AwggCEEANgIQIAEgBUEQaiIKKAIAIgIgBUEMaiIMKAIAIglrQSxtIg9LBEAgBUEUaiITKAIAIgQgAmtBLG0gASAPayIDSQRAIAFB3ejFLksNAyAEIAlrQSxtIgJBrvSiF0khBCACQQF0IgIgAUkEQCABIQILIAQEfyACBUHd6MUuCyIJBH8gCUHd6MUuSw0FIAlBLGwQ4AUFQQALIgsgD0EsbGoiAiEEA0AgBCASNgIAIAQgKzgCBCAEICs4AgggBEEBNgIMIARDAAAAADgCECAEQwAAAD84AhQgBEEYaiIPIAgpAgA3AgAgDyAIKQIINwIIIA8gCCgCEDYCECAEQSxqIQQgA0F/aiIDDQALIAsgCUEsbGohCSALIAFBLGxqIQsgCigCACIDIAwoAgAiBEYEfyACIQEgBAUgAiEBA0AgAUFUaiIBIANBVGoiAykCADcCACABIAMpAgg3AgggASADKQIQNwIQIAEgAykCGDcCGCABIAMpAiA3AiAgASADKAIoNgIoIAMgBEcNAAsgDCgCAAshAyAMIAE2AgAgCiALNgIAIBMgCTYCACADBEAgAxDhBQsFIAIhAQNAIAEgEjYCACABICs4AgQgASArOAIIIAFBATYCDCABQwAAAAA4AhAgAUMAAAA/OAIUIAFBGGoiASAIKQIANwIAIAEgCCkCCDcCCCABIAgoAhA2AhAgCiAKKAIAQSxqIgE2AgAgA0F/aiIDDQALCyARKAIAIgFBBGoiAiEDIAUqAgAhKiACKAIAIQIFIAEgD0kEfyAKIAkgAUEsbGo2AgAgASECIAQFIAEhAiAECyEBCyAIQwAAAAA4AgAgIUMAAAAAOAIAICJDAACAPyAqQwrXIzyUlSIqOAIAICNDAAAAADgCACAkQQA6AAAgAiAFQcQAaiIJKAIAIAVBQGsiDygCACILa0EUbSIESwRAIA8gAiAEayAIEKcBQwAAgD8gBSoCAEMK1yM8lJUhKiARKAIAIgFBBGohAwUgAiAESQRAIAkgCyACQRRsajYCAAsLIAMoAgAhAiAIQwAAAAA4AgAgJUMAAAAAOAIAICYgKjgCACAnQwAAAAA4AgAgKEEAOgAAIAIgBUHQAGoiCSgCACAFQcwAaiISKAIAIgtrQRRtIgRLBEAgEiACIARrIAgQpwEgESgCACIDQQRqIQIFIAIgBEkEfyAJIAsgAkEUbGo2AgAgAyECIAEFIAMhAiABCyEDCyAFKAJYIgQgBSoCgAEiKkPbD0k/lEPbD0k/kiIrQ9sPyT+SQ4P5IkKUIiyoIgFBAnRByB9qKgIAIi4gAUECdEHMH2oqAgAgLpMgLCABspOUkiIsOAIAIAQgLDgCBCAFKAJgIgQgK0OD+SJClCIrqCIBQQJ0QcgfaioCACIsICsgAbKTIAFBAnRBzB9qKgIAICyTlJIiKzgCACAEICs4AgQgBSAqOAKMASAFIAMqAgxDAAAAAF4EfUMAAIA/BUMAAIC/CzgCJCAFKAJoIgEgBUH8AGoiBCgCADYCACABIAQoAgAiATYCBCAFIAE2AogBIAIoAgAEQCAMKAIAIgEgCigCACILRiERIAshBCABIQogEUUEQCADQRRqIQwgASECA0AgAkMAAAAAOAIYIAJDAAAAADgCHCACQwAAAAA4AiQgAiACKAIINgIEIAJBFGoiE0MAAAA/OAIAIAJBDGoiFkEBNgIAIAhDpHB9PzgCACAMKgIAQ6RwfT9eBH8gCAUgDAshCSAXQwrXIzw4AgAgEyAJKgIAQwrXIzxdBH8gFwUgCQsoAgA2AgAgFiADKAIANgIAIAJBLGoiAiALRw0ACwsCQCAFQShqIgwsAAAiAiADLAAQIglGBEAgBUEgaiEMIAQgCmsiBCEKIARBLG0hBAUgDCAJOgAAIAVBIGoiDCoCACEqIAQgCmsiCkEsbSIEQQFLBEAgKiAEQX9qs5UhKyAJRQRAQwAAAAAhKwsFQwAAAAAhKwsgEQRAIAkhAgwCCyABIQIDQCAqIAJBGGoiEyoCACACQRxqIhYqAgCTkyIsQwAAAABeIikEfUPbD0lABUPbD0nACyEuIBYgLCAukrtEAAAAYPshGUAQLLYgKQR9Q9sPScAFQ9sPSUALkiIsOAIAIAIgLLtE/Knx0k1iUD+itjgCICATICo4AgAgKiArkyEqIAJBLGoiAiALRw0ACyAJIQILCyAMIAMqAggiKjgCACAEQQFLBEAgKiAEQX9qs5UhKyACQf8BcUUEQEMAAAAAISsLBUMAAAAAISsLIBFFBEADQCAqu0QAAABg+yEZQBAstiIuQ9sPyUCSISwgASAuQwAAAABdBH0gLAUgLiIsCzgCGCABICw4AiQgKiArkyEqIAFBLGoiASALRw0ACwsCQCAKQSxGBEAgDygCACIBQYCAgPgDNgIAIAFBgICA+AM2AgQgEigCACIBQYCAgPgDNgIAIAFBgICA+AM2AgQFIAMqAhxDAAAgQZQgBEF/arNDAAAAP5QiK5UhLCAKRQ0BIA8oAgAhAiASKAIAIQlBACEBA0AgAiABQRRsakMAAIA/QwAAgD8gLCArIAGzk5RDAACAPZSTIiogKpQiKiAqlCIqICqUIiogKpRDAACAP5KVIio4AgAgAiABQRRsaiAqOAIEIAkgAUEUbGpDAACAPyAqkyIqOAIAIAkgAUEUbGogKjgCBCABQQFqIgEgBEkNAAsLCyAFIAMqAhgQmQELIAVBkAFqIgUgIEcNAAsMBAsQrAQMAQtBCBAFIgFBpYgBEOQFIAFB8OQANgIAIAFBmBlBkQEQBwsLCyAeKAIAIgEgHygCACICRwRAA0AgASgCNCABKAIwIgNrIgVBAEoEQCADQQAgBRC/BhoLIAEoAkQgAUFAaygCACIDayIFQQBKBEAgA0EAIAUQvwYaCyABKAJUIAEoAlAiA2siBUEASgRAIANBACAFEL8GGgsgASgCZCABKAJgIgNrIgVBAEoEQCADQQAgBRC/BhoLIAEgAUGIAWoiAygCABDRASABIAMoAgAiAygCBDYCJCABKgLMASIsIAEqAhwiKl1FBEAgLCABKgIYIipeRQRAICwhKgsLIAFBFGoiBSoCACAqXARAIAUgKjgCACABQwAAgD8gKkPbD0lAlCABKgIMlBDNAiIqQwAAgD+SlSIrOAJ8IAEgKiArlCIqOAJsIAEgKiAqlCIrOAJwIAEgKiArlCIrOAJ0IAEgKiArlCIrOAJ4IAEgKjgCLCABICo4AjwgASAqOAJMIAEgKjgCXCABQwAAgD8gKyABKgKEAZRDAACAP5KVOAKAAQsgASAsOAKQASABICw4ApQBIAFBhAFqIgUqAgACfSABKgLQASIqQwAAAABdBH1DAAAAAAVDAAAgQSAqQwAAIEFeDQEaICoLCyIrXARAIAUgKzgCACABQwAAgD8gKyABKgJ4lEMAAIA/kpU4AoABCyABICo4AqQBIAEgKjgCqAEgASADQRBqIgMqAgBDAACAP5I4AiggASADKAIANgK4ASABIAMoAgA2ArwBIAEgLDgC1AEgASAqOALYASABQdwBaiIBIAJHDQALCyAVKAIAIgEqAggiK0MAAAAAXAR9IAEoAhiyIiwhKiAaKAIAsiAskyArIAYqAgyUlQUgGigCALIhKkMAAAAACyErIAYgKjgCxAMgBiArOALQAyAGIBwtAACyQwQCATyUOALMAyAGIC04ArADIAYgLTgCtAMgBkEwaiIBIBQoAgBBiAFqQZABEL0GGiABQQE2AgAgG0EBNgIAQRAQ4AUiAUEANgIAIAEgBzYCCCABIA02AgwgGEUEQCANQQRqIgMgAygCAEEBajYCAAsgASAONgIEIAEgDigCACIDNgIAIAMgATYCBCAOIAE2AgAgGSAZKAIAQQFqNgIAAkAgACgC4AQiBgRAIAAoAtwEIAZBf2oiAyAGcUUiAgR/IANB/gFxBSAGQf4BSwR/Qf4BBUH+ASAGcAsLIgdBAnRqKAIAIgEEQCABKAIAIgEEQAJAIAIEQANAIAEoAgQiBkH+AUYiAiAGIANxIAdGckUNBiACBEAgASgCCEH+AUYNAwsgASgCACIBDQAMBgsABQNAIAEoAgQiA0H+AUYEQCABKAIIQf4BRg0DBSADIAZPBEAgAyAGcCEDCyADIAdHDQcLIAEoAgAiAQ0ADAYLAAsACyAIIB1B/wFxskMEAgE8lDgCACAAQX4gCBCVAQsLCwsgGARAIBAkBw8LIA1BBGoiASgCACEAIAEgAEF/ajYCACAABEAgECQHDwsgDSANKAIAKAIIQf8BcUHbAmoRAAAgDRDbBSAQJAcLngoCD38DfSMHIQojB0EQaiQHIAohBiABKAIQIQkgACgCgAQsAAwEQCAAQaAEaiECIAAoAqgEBEAgAEGIBGohBCAAQZAEaiIMKAIAIgEEQCACKAIAKAIIIgJByANqIgMoAgAgCUYEQCADIAQoAgAiA0EIaiIAKAIAIgE2AgAgAigCBCoCCCIRQwAAAABcBEAgAiABsiACKgLEA5MgESACKgIMlJU4AtADBSACIAAoAgCyIhE4AsQDIAIoAiAiASgCiAEiACoCCCAAKgIUIBGUQ6uqqj2UuxAgtpQhESABQZABaiEAIAEsAKABBEAgASoCnAEiE0MAAAAAWwR9IAAgETgCACARBSAAKgIACyESBSABIAEqApgBIBEgACoCACISk4uUIhM4ApwBCyABIBE4ApQBAkAgEiARXARAIBIgEV0EQCAAIBIgE5IiEjgCACASIBFeRQRAIBIhEQwDCyAAIBE4AgAFIAAgEiATkyISOAIAIBIgEV1FBEAgEiERDAMLIAAgETgCAAsFIBIhEQsLIAEgETgCzAELIAMoAgAiACADQQRqIgEoAgA2AgQgASgCACAANgIAIAwgDCgCAEF/ajYCACADEOEFIAokBw8LIAYgBjYCACAGQQRqIhAgBjYCACAGQQhqIg9BADYCAAJAIAQgACgCjAQiAyICRwRAIAYgBEYEQANAIAIoAgQhACADKAIIIAlGBEACQCAEIAAiAUYEQEEAIQUgBCEBBQNAIAAoAgggCUcEQEEBIQUMAwsgBCABKAIEIgAiAUcNAEEAIQUgBCEBCwsLIAIgAUcEQCACKAIAIgggACgCACILQQRqIgcoAgA2AgQgBygCACAINgIAIAYoAgAiCCACNgIEIAMgCDYCACAGIAs2AgAgByAGNgIACyAFBEAgASgCBCEACwsgBCAAIgJGDQMgACEDDAALAAsgAyELIAIhCCABIQBBACECIAYhAwNAIAgoAgQhASALKAIIIAlGBEACQCAEIAEiB0YEQEEAIQ0gBCEFBSAHIQUDQCABKAIIIAlHBEBBASENDAMLIAQgBSgCBCIBIgVHDQALIAQhBUEAIQ0LCyAIIAVHBEAgBSAHRgRAQQEhAwVBASEDA0AgA0EBaiEDIAcoAgQiByAFRw0ACwsgDCAAIANrIgA2AgAgDyACIANqIgI2AgAgCCgCACIOIAEoAgAiA0EEaiIHKAIANgIEIAcoAgAgDjYCACAGKAIAIg4gCDYCBCALIA42AgAgBiADNgIAIAcgBjYCAAsgDQRAIAUoAgQhAQsLIAQgASIIRwRAIAEhCwwBCwsgAgRAIBAoAgAiACgCACIBIANBBGoiAigCADYCBCACKAIAIAE2AgAgD0EANgIAIAAgBkcEQANAIAAoAgQhASAAEOEFIAEgBkcEQCABIQAMAQsLCwsLCyAKJAcPCwsLIABBoARqIgMgACgCpAQiACIBRgRAIAokBw8LA0AgACgCCCECIAAoAgwiAEUiBEUEQCAAQQRqIgUgBSgCAEEBajYCAAsCQCACKALIAyAJRgRAAkACQAJAIAJBMGoiBSgCAA4GAAEBAQAAAQsMAQsgBUEENgIACwJAAkAgAkHAAWoiAigCAA4GAAEBAQAAAQsMAgsgAkEENgIACwsgBEUEQCAAQQRqIgQoAgAhAiAEIAJBf2o2AgAgAkUEQCAAIAAoAgAoAghB/wFxQdsCahEAACAAENsFCwsgAyABKAIEIgAiAUcNAAsgCiQHC8gCAQh/IwchBSMHQRBqJAcgBSEIIAFB/wFxIQMgACgC4AQiBEUEQCAFJAcPCyAAKALcBCAEQX9qIgYgBHFFIgcEfyAGIANxBSAEIANLBH8gAwUgAyAEcAsLIglBAnRqKAIAIgJFBEAgBSQHDwsgAigCACICRQRAIAUkBw8LAkAgBwRAA38Cf0EWIAIoAgQiBCADRiIHIAQgBnEgCUZyRQ0AGiAHBEAgAigCCCADRg0ECyACKAIAIgIEfwwCBUEWCwsLIgJBFkYEQCAFJAcPCwUDfwJ/IAIoAgQiBiADRgRAIAIoAgggA0YNBAUgBiAETwRAIAYgBHAhBgtBFiAGIAlHDQEaCyACKAIAIgIEfwwCBUEWCwsLIgJBFkYEQCAFJAcPCwsLIAggACgCICADai0AALJDBAIBPJQ4AgAgACABIAgQlQEgBSQHC80DARF/IwchAiMHQaAQaiQHIAJBqAhqIQcgAkGQCGohBCACQShqIQYgAkGwCGohCiACIQUgAEGgBGoiDSAAKAKkBCIBIgtGBEAgAiQHDwsgAEEsaiEOIAVBCGohDyAFQRhqIQwgBUEQaiEQIAVBFGohEQJAA0AgASgCCCEDIAEoAgwiAUUiCEUEQCABQQRqIgkgCSgCAEEBajYCAAsgDigCACADKALIAyIJQf8BcSIDQQJ0aigCAEEASgRAIAlB/wFxQRh0QRh1QX9MDQIgDEIANwMAIAxBADYCCCAFQYB/OgAAIBAgAzYCACARQQA6AAAgD0QAAAAAAAAAADkDACAAIAUQkAELIAhFBEAgAUEEaiIIKAIAIQMgCCADQX9qNgIAIANFBEAgASABKAIAKAIIQf8BcUHbAmoRAAAgARDbBQsLIA0gCygCBCIBIgtHDQALIAIkBw8LIAYgAzYCACAKQegHQcz+ACAGEKACGiAEIAo2AgAgBEH7/gA2AgQgBEHp9gA2AgggBEGgAjYCDCAEQZX/ADYCECAGQegHQfWiASAEEKACGiAHQcSkATYCACAHIAY2AgRBBCAHEB1BsNkBQen2AEGgAkHe/wAQBAu0AwEQfyMHIQIjB0GgEGokByACQagIaiEHIAJBkAhqIQQgAkEoaiEGIAJBsAhqIQogAiEFIABBoARqIg0gACgCpAQiASILRgRAIAIkBw8LIAVBCGohDiAFQRhqIQwgBUEQaiEPIAVBFGohEAJAA0AgASgCCCEDIAEoAgwiAUUiCEUEQCABQQRqIgkgCSgCAEEBajYCAAsgAygCyAMiCUH/AXEhAyAJQf8BcUEYdEEYdUF/TA0BIAxCADcDACAMQQA2AgggBUGAfzoAACAPIAM2AgAgEEEAOgAAIA5EAAAAAAAAAAA5AwAgACAFEJABIAhFBEAgAUEEaiIIKAIAIQMgCCADQX9qNgIAIANFBEAgASABKAIAKAIIQf8BcUHbAmoRAAAgARDbBQsLIA0gCygCBCIBIgtHDQALIAIkBw8LIAYgAzYCACAKQegHQcz+ACAGEKACGiAEIAo2AgAgBEH7/gA2AgQgBEHp9gA2AgggBEGgAjYCDCAEQZX/ADYCECAGQegHQfWiASAEEKACGiAHQcSkATYCACAHIAY2AgRBBCAHEB1BsNkBQen2AEGgAkHe/wAQBAvxAQIFfwF9IAAqAhggAC4BHLJDAAAAxpKUQwAAADmUIQYgAEGgBGoiBCAAKAKkBCIAIgNGBEAPCwNAIAAoAgghASAAKAIMIgBFIgVFBEAgAEEEaiICIAIoAgBBAWo2AgALIAFBsANqIQIgASwAwAMEQCABKgK8A0MAAAAAWwRAIAIgBjgCAAsFIAEgASoCuAMgBiACKgIAk4uUOAK8AwsgASAGOAK0AyAFRQRAIABBBGoiAigCACEBIAIgAUF/ajYCACABRQRAIAAgACgCACgCCEH/AXFB2wJqEQAAIAAQ2wULCyAEIAMoAgQiACIDRw0ACwvGBQIKfwJ9IwchCiMHQRBqJAcgCiEHIABB3ARqIQggAUH/AXEhBQJAAkAgAEHgBGoiDCgCACIGRSIJBEBBACEBBSAIKAIAIAZBf2oiCyAGcUUiBAR/IAsgBXEFIAYgBUsEfyAFBSAFIAZwCwsiAUECdGooAgAiAwRAIAMoAgAiAwRAIAQEQANAIAMoAgQiBCAFRiAEIAtxIAFGckUNBSADKAIIIAVGDQYgAygCACIDDQAMBQsACwNAIAMoAgQiBCAFRwRAIAQgBk8EQCAEIAZwIQQLIAQgAUcNBQsgAygCCCAFRg0FIAMoAgAiAw0ACwsLCwtBIBDgBSIEIAU2AgggBEEMaiIDQgA3AgAgA0IANwIIIARBgICA/AM2AhwgBCAFNgIEIARBADYCAAJAIAkgACoC7AQiDiAGs5QgAEHoBGoiCSgCAEEBarMiDV1yBEAgCCAGQQF0IAZBA0kgBkF/aiAGcUEAR3JyIgMgDSAOlY2pIgFJBH8gAQUgAwsQowEgDCgCACIBQX9qIgYgAXFFBEAgASEDIAYgBXEhAQwCCyABIAVLBH8gASEDIAUFIAEhAyAFIAFwCyEBBSAGIQMLCwJAAkAgCCgCACABQQJ0aiIFKAIAIgEEQCAEIAEoAgA2AgAMAQUgBCAAQeQEaiIBKAIANgIAIAEgBDYCACAFIAE2AgAgBCgCACIBBEAgASgCBCEBIANBf2oiBSADcQRAIAEgA08EQCABIANwIQELBSABIAVxIQELIAgoAgAgAUECdGohAQwCCwsMAQsgASAENgIACyAJIAkoAgBBAWo2AgAgBCEDCyADKAIUIgFFBEAgCiQHDwsgB0ELaiEDA0AgByABKgIMIg0gASoCECANkyACKgIAlJIQkgYgACABKAIIIAcQlgEgAywAAEEASARAIAcoAgAQ4QULIAEoAgAiAQ0ACyAKJAcL8qkBAwd/BX0FfCMHIQMjB0EQaiQHIANBCGohBSADQQRqIQcgAyEEIAFBseyliwFIBEAgAUHSoJnzfEgEQCABQZWhuvN5SARAIAFBmoCE8nhOBEAgAUHeydWceUgEQCABQdOGqvl4SARAIAFBmoCE8nhrBEAgAyQHDwsgAhCGBiECIAAoAqgDKAIIIgFB6ABqIgAoAgAgAkYEQCADJAcPCyABKAJgIgEEQCAFIAI2AgAgASAFIAEoAgAoAhhBP3FB3QRqEQUACyAAIAI2AgAgAyQHDwsgAUH4yNT7eEgEQCABQdOGqvl4awRAIAMkBw8LIAIQjAYhCiAAKAL4AyAKIAqUOAIMIAMkBw8LIAFB+MjU+3hrBEAgAyQHDwsgAhCMBiEKIAAoAqgDKAIIIgFBiAFqIgAqAgAgClsEQCADJAcPCyABKAKAASIBBEAgBSAKOAIAIAEgBSABKAIAKAIYQT9xQd0EahEFAAsgACAKOAIAIAMkBw8LIAFBs9eu13lIBEAgAUHeydWceWsEQCADJAcPCyACEIwGIQwgACgCqAMoAhBBCGoiASoCACAMWwRAIAMkBw8LIAEgDDgCACAAQaAEaiIHIAAoAqQEIgEiAEYEQCADJAcPCwNAIAEoAggoAhQiBCAMOALAAiAEKAKwAiICIAQoAqwCIgFrQSxtIgVBAUsEfSAMIAVBf2qzlSEKIAQsAMgCBH0gCgVDAAAAAAsFQwAAAAALIQsgASACRwRAIAwhCgNAIAogAUEYaiIGKgIAIAFBHGoiBCoCAJOTIg5DAAAAAF4iBQR9Q9sPSUAFQ9sPScALIQ0gBCAOIA2Su0QAAABg+yEZQBAstiAFBH1D2w9JwAVD2w9JQAuSIg04AgAgASANu0T8qfHSTWJQP6K2OAIgIAYgCjgCACAKIAuTIQogAUEsaiIBIAJHDQALCyAHIAAoAgQiASIARw0ACyADJAcPCyABQZPuydl5SARAIAFBs9eu13lrBEAgAyQHDwsgAhCMBiAAKAK0BCICKgIAkyACKgIIlBDQAkMAAIC/kiEKIAAoAqgDKAIIQRhqIgEqAgAgAioCBCACKgIQIAqUkiIKWwRAIAMkBw8LIAEgCjgCACAAQaAEaiICIAAoAqQEIgEiAEYEQCADJAcPCwNAIAEoAggoAhRBkAFqIAoQmQEgAiAAKAIEIgEiAEcNAAsgAyQHDwUgAUGT7snZeWsEQCADJAcPCyACEIwGIQogACgC+ANBFGoiAiAKOAIAIABBoARqIgUgACgCpAQiASIARgRAIAMkBw8LIAEoAgggCjgC/AIgBSAAKAIEIgEiAEYEQCADJAcPCwNAIAEoAgggAigCADYC/AIgBSAAKAIEIgEiAEcNAAsgAyQHDwsACyABQduE+sV4SARAIAFBk8PDqXhIBEAgAUHOgpGgeGsEQCADJAcPCyACEIYGQQBHIQEgACgCtAMoAgAgAToAGSADJAcPCyABQZPDw6l4awRAIAMkBw8LIAIQjAYgACgC1AQiAioCAJMgAioCCJQQ0AJDAACAv5IhCiAAKAKABEEIaiIBKgIAIAIqAgQgAioCECAKlJIiClsEQCADJAcPCyABIAo4AgAgAEGgBGoiAiAAKAKkBCIBIgBGBEAgAyQHDwsDQCABKAIIIgEoAgQqAggiCkMAAAAAXAR9IAEoAsgDsiABKgLEA5MgCiABKgIMlJUFQwAAAAALIQogASAKOALQAyACIAAoAgQiASIARw0ACyADJAcPCyABQfv7keN4SARAIAFB24T6xXhrBEAgAyQHDwsgAhCMBiEKIABBxANqIgEqAgAgClsEQCADJAcPCyABIAo4AgAgCiAAKAKsBCIBKgIAkyABKgIIlBDQAkMAAIC/kiEKIABBiAFqIAEqAgQgASoCECAKlJIQnQEgAEGgBGoiCCAAKAKkBCIBIgJGBEAgAyQHDwsgAEHYAWohByAAQdABaiEGIABByAFqIQQgAEHgAWohBSACIQADQCABKAIIIgEgBysDADkDgAEgASAGKwMAOQN4IAEgBCsDADkDcCABIAUrAwA5A4gBIAggACgCBCIBIgBHDQALIAMkBw8LIAFBzfyb43hIBEAgAUH7+5HjeGsEQCADJAcPCyACEIwGIQogAEHcA2oiASoCACAKWwRAIAMkBw8LIAEgCjgCACAKIAAoAqwEIgEqAgCTIAEqAgiUENACQwAAgL+SIQogAEGYAmogASoCBCABKgIQIAqUkhCcASAAQaAEaiIIIAAoAqQEIgEiAkYEQCADJAcPCyAAQcACaiEHIABBuAJqIQYgAEGwAmohBCAAQcgCaiEFIAIhAANAIAEoAggiASAHKwMAOQPoASABIAYrAwA5A+ABIAEgBCsDADkD2AEgASAFKwMAOQPwASAIIAAoAgQiASIARw0ACyADJAcPCyABQc38m+N4awRAIAMkBw8LIAIQhgYhAiAAKAKoAygCCEEQaiIBLQAAsiACslsEQCADJAcPCyABIAJBAEciAiIIOgAAIABBoARqIgcgACgCpAQiASIARgRAIAMkBw8LIAJFBEADQCABKAIIKAIUIgJBuAFqIgEsAAAgCEcEQCABIAg6AAAgAioCsAEhDCACKAKcASIBIAIoAqABIgZHBEADQCAMIAFBGGoiBCoCACABQRxqIgUqAgCTkyILQwAAAABeIgIEfUPbD0lABUPbD0nACyEKIAUgCyAKkrtEAAAAYPshGUAQLLYgAgR9Q9sPScAFQ9sPSUALkiIKOAIAIAEgCrtE/Knx0k1iUD+itjgCICAEIAw4AgAgAUEsaiIBIAZHDQALCwsgByAAKAIEIgEiAEcNAAsgAyQHDwsDQCABKAIIKAIUIgVBuAFqIgEsAAAgCEcEQCABIAg6AAAgBSoCsAEhCiAFKAKgASICIAUoApwBIgFrQSxtIgVBAUsEfSAKIAVBf2qzlQVDAAAAAAshDSABIAJHBEADQCAKIAFBGGoiBioCACABQRxqIgQqAgCTkyIMQwAAAABeIgUEfUPbD0lABUPbD0nACyELIAQgDCALkrtEAAAAYPshGUAQLLYgBQR9Q9sPScAFQ9sPSUALkiILOAIAIAEgC7tE/Knx0k1iUD+itjgCICAGIAo4AgAgCiANkyEKIAFBLGoiASACRw0ACwsLIAcgACgCBCIBIgBHDQALIAMkBw8LIAFB5u+u9HpOBEAgAUH0xLfIe04EQCABQcD1qpl8SARAIAFB9MS3yHtrBEAgAyQHDwsgAhCGBiEEIAAoAqgDKAIAQQRqIgEoAgAgBEYEQCADJAcPCyABIAQ2AgAgAEGgBGoiAiAAKAKkBCIBIgBGBEAgAyQHDwsDQCABKAIIKAIUIQEgBSAENgIAIAEgBRCXASACIAAoAgQiASIARw0ACyADJAcPCyABQfaHh+N8TgRAIAFB9oeH43xrBEAgAyQHDwsgAhCGBkEARyEBIAAoAqgDKAIIIAE6ACggABCbASADJAcPCyABQcD1qpl8awRAIAMkBw8LIAIQhgYEfUMAAIC/BUMAAIA/CyEKIAAoAqgDKAIIQQxqIgEqAgAgClsEQCADJAcPCyABIAo4AgAgAEGgBGoiAiAAKAKkBCIBIgBGBEAgAyQHDwsDQCABKAIIKAIUIAo4ArQBIAIgACgCBCIBIgBHDQALIAMkBw8LIAFBtI29n3tIBEAgAUHm7670emsEQCADJAcPCyACEIwGIQogACgCqAMoAhBBJGoiASoCACAKWwRAIAMkBw8LIAEgCjgCACAAQaAEaiICIAAoAqQEIgEiAEYEQCADJAcPCwNAIAEoAggoAhRBoAJqIAoQmAEgAiAAKAIEIgEiAEcNAAsgAyQHDwsgAUHt1+Ote0gEQCABQbSNvZ97awRAIAMkBw8LIAIQjAYhCiAAQegDaiIBKgIAIApbBEAgAyQHDwsgASAKOAIAIAogACgCrAQiASoCAJMgASoCCJQQ0AJDAACAv5IhCiAAQZgCaiABKgIEIAEqAhAgCpSSEJ4BIABBoARqIgggACgCpAQiASICRgRAIAMkBw8LIABBiANqIQcgAEGAA2ohBiAAQfgCaiEEIABBkANqIQUgAiEAA0AgASgCCCIBIAcrAwA5A7ACIAEgBisDADkDqAIgASAEKwMAOQOgAiABIAUrAwA5A7gCIAggACgCBCIBIgBHDQALIAMkBw8LIAFB7dfjrXtrBEAgAyQHDwsgAhCMBiIKIAqUIQogACgCqAMoAghBIGoiASoCACAKWwRAIAMkBw8LIAEgCjgCACAAQaAEaiICIAAoAqQEIgEiAEYEQCADJAcPCwNAIAEoAggoAhQoAvgBIgEsABAEQCABKgIMQwAAAABbBEAgASAKOAIACwUgASABKgIIIAogASoCAJOLlDgCDAsgASAKOAIEIAIgACgCBCIBIgBHDQALIAMkBw8LIAFBuKj3kXpOBEAgAUG73q++ekgEQCABQbio95F6awRAIAMkBw8LIAIQjAYhCiAAKAKoAygCAEEkaiIBKgIAIApbBEAgAyQHDwsgASAKOAIAIABBoARqIgIgACgCpAQiASIARgRAIAMkBw8LA0AgASgCCCgCFCAKEJgBIAIgACgCBCIBIgBHDQALIAMkBw8LIAFBvq/f8npIBEAgAUG73q++emsEQCADJAcPCyACEIwGIQogACgCqAMoAgggCjgCLCADJAcPCyABQb6v3/J6awRAIAMkBw8LIAIQhgYhAiAAKAKoAygCCCIBQcgAaiIAKAIAIAJGBEAgAyQHDwsgAUFAaygCACIBBEAgBSACNgIAIAEgBSABKAIAKAIYQT9xQd0EahEFAAsgACACNgIAIAMkBw8LIAFBs+7zgXpIBEAgAUGVobrzeWsEQCADJAcPCyACEIwGIQogAEHsA2oiASoCACAKWwRAIAMkBw8LIAEgCjgCACAAQcACaiIHIAogCkMAAAAAXQR9QwAAgL8FQwAAgD8LIguUQwAAAEGUIgq7RI3ttaD3xrA+YwR8RAAAAAAAAAAABUQAAAAAAADwPyAKQwAAgD2UQwAAgD+SIgogCpQiCiAKlCIKIAqUIgogCpRDAACAv5K7oyALu6ILIhI5AwAgAEHIAmoiBAJ8IABBsAJqIgYrAwAiEUQAAAAAAAAAAGEEfCAARAAAAAAAAAAAOQO4AkQAAAAAAAAAACEPRAAAAAAAAPA/BSASRAAAAAAAAAAAYQRAIABEAAAAAAAA8D85A7gCRAAAAAAAAPA/IQ9EAAAAAAAA8D8gEaMMAgsgEbYhC0QAAAAAAADwPyAStiIKu6MhDyAAIApDAAAAAF0EfEQAAAAAAADwPyAPoRDRAgUgD0QAAAAAAADwP6AQ0QKaCyIPIAu7oxDPAiIPOQO4AiASRAAAAAAAAPA/oCEQIBJEAAAAAAAAAABkBHwgEAUgEgtEAAAAAAAA8D8gD6GiCwsiEDkDACAAQaAEaiIIIAAoAqQEIgUiAUYEQCADJAcPCyAAQbgCaiECIAUoAggiACASOQPoASAAIA85A+ABIAAgETkD2AEgACAQOQPwASAIIAEoAgQiASIARgRAIAMkBw8LA0AgAisDACERIAYrAwAhECAEKwMAIQ8gASgCCCIBIAcrAwA5A+gBIAEgETkD4AEgASAQOQPYASABIA85A/ABIAggACgCBCIBIgBHDQALIAMkBw8FIAFBs+7zgXprBEAgAyQHDwsgAhCMBiEKIABB0ANqIgEqAgAgClsEQCADJAcPCyABIAo4AgAgAEGwAWoiByAKIApDAAAAAF0EfUMAAIC/BUMAAIA/CyILlEMAAABBlCIKu0SN7bWg98awPmMEfEQAAAAAAAAAAAVEAAAAAAAA8D8gCkMAAIA9lEMAAIA/kiIKIAqUIgogCpQiCiAKlCIKIAqUQwAAgL+Su6MgC7uiCyISOQMAIABBuAFqIgQCfCAAQaABaiIGKwMAIhFEAAAAAAAAAABhBHwgAEQAAAAAAAAAADkDqAFEAAAAAAAAAAAhD0QAAAAAAADwPwUgEkQAAAAAAAAAAGEEQCAARAAAAAAAAPA/OQOoAUQAAAAAAADwPyEPRAAAAAAAAPA/IBGjDAILIBG2IQtEAAAAAAAA8D8gErYiCrujIQ8gACAKQwAAAABdBHxEAAAAAAAA8D8gD6EQ0QIFIA9EAAAAAAAA8D+gENECmgsiDyALu6MQzwIiDzkDqAEgEkQAAAAAAADwP6AhECASRAAAAAAAAAAAZAR8IBAFIBILRAAAAAAAAPA/IA+hogsLIhA5AwAgAEGgBGoiCCAAKAKkBCIFIgFGBEAgAyQHDwsgAEGoAWohAiAFKAIIIgAgEjkDWCAAIA85A1AgACAROQNIIAAgEDkDYCAIIAEoAgQiASIARgRAIAMkBw8LA0AgAisDACERIAYrAwAhECAEKwMAIQ8gASgCCCIBIAcrAwA5A1ggASAROQNQIAEgEDkDSCABIA85A2AgCCAAKAIEIgEiAEcNAAsgAyQHDwsACyABQZ/t3A1IBEAgAUHvkrSUf0gEQCABQYS54NN9SARAIAFBxvCvkH1IBEAgAUHSoJnzfGsEQCADJAcPCyACEIwGIgogCpQhCiAAKAKoAygCCEEcaiIBKgIAIApbBEAgAyQHDwsgASAKOAIAIABBoARqIgIgACgCpAQiASIARgRAIAMkBw8LA0AgASgCCCgCFEGQAWogChCaASACIAAoAgQiASIARw0ACyADJAcPBSABQcbwr5B9awRAIAMkBw8LIAIQjAYhCiAAQcwDaiIBKgIAIApbBEAgAyQHDwsgASAKOAIAIAogACgCrAQiASoCAJMgASoCCJQQ0AJDAACAv5IhCiAAQYgBaiABKgIEIAEqAhAgCpSSEJ4BIABBoARqIgggACgCpAQiASICRgRAIAMkBw8LIABB+AFqIQcgAEHwAWohBiAAQegBaiEEIABBgAJqIQUgAiEAA0AgASgCCCIBIAcrAwA5A6ABIAEgBisDADkDmAEgASAEKwMAOQOQASABIAUrAwA5A6gBIAggACgCBCIBIgBHDQALIAMkBw8LAAsgAUHCyemqfk4EQCABQbzUzcp+TgRAIAFBvNTNyn5rBEAgAyQHDwsgAhCMBiEKIAAoAvgDIgJBCGoiASoCACAKWwRAIAMkBw8LIAEgCjgCACAAKAKoBEUEQCADJAcPCyACIAApA1A3AxggAiAAKAKkBCgCCCgC9AI2AiAgAyQHDwsgAUHCyemqfmsEQCADJAcPCyACEIYGIQQgACgCqAMoAhBBBGoiASgCACAERgRAIAMkBw8LIAEgBDYCACAAQaAEaiICIAAoAqQEIgEiAEYEQCADJAcPCwNAIAEoAggoAhRBoAJqIQEgBSAENgIAIAEgBRCXASACIAAoAgQiASIARw0ACyADJAcPCyABQYS54NN9awRAIAMkBw8LIAIQhgYhAiAAKAKoAygCAEEQaiIBLQAAsiACslsEQCADJAcPCyABIAJBAEciAiIIOgAAIABBoARqIgcgACgCpAQiASIARgRAIAMkBw8LIAJFBEADQCABKAIIKAIUIgJBKGoiASwAACAIRwRAIAEgCDoAACACKgIgIQwgAigCDCIBIAIoAhAiBkcEQANAIAwgAUEYaiIEKgIAIAFBHGoiBSoCAJOTIgtDAAAAAF4iAgR9Q9sPSUAFQ9sPScALIQogBSALIAqSu0QAAABg+yEZQBAstiACBH1D2w9JwAVD2w9JQAuSIgo4AgAgASAKu0T8qfHSTWJQP6K2OAIgIAQgDDgCACABQSxqIgEgBkcNAAsLCyAHIAAoAgQiASIARw0ACyADJAcPCwNAIAEoAggoAhQiBUEoaiIBLAAAIAhHBEAgASAIOgAAIAUqAiAhCiAFKAIQIgIgBSgCDCIBa0EsbSIFQQFLBH0gCiAFQX9qs5UFQwAAAAALIQ0gASACRwRAA0AgCiABQRhqIgYqAgAgAUEcaiIEKgIAk5MiDEMAAAAAXiIFBH1D2w9JQAVD2w9JwAshCyAEIAwgC5K7RAAAAGD7IRlAECy2IAUEfUPbD0nABUPbD0lAC5IiCzgCACABIAu7RPyp8dJNYlA/orY4AiAgBiAKOAIAIAogDZMhCiABQSxqIgEgAkcNAAsLCyAHIAAoAgQiASIARw0ACyADJAcPCyABQZKs9K1/SARAIAFBq5K2lH9IBEAgAUHvkrSUf2sEQCADJAcPCyACEIYGIQIgACgCqAMoAgAiAUHoAGoiACgCACACRgRAIAMkBw8LIAEoAmAiAQRAIAUgAjYCACABIAUgASgCACgCGEE/cUHdBGoRBQALIAAgAjYCACADJAcPCyABQZPglaV/TgRAIAFBk+CVpX9rBEAgAyQHDwsgAhCGBiEBIAVBuOYBKAIAIAFBBHRqKAIAIgI2AgAgACgCtAMoAggiASgCACACRwRAIAEgAjYCACAAEJsBIABBoARqIgIgACgCpAQiASIARwRAA0AgASgCCCgCIEHcAWogBRDRASACIAAoAgQiASIARw0ACwsLIAMkBw8LIAFBq5K2lH9rBEAgAyQHDwsgAhCGBiECIAAoAqgDKAIAIgEoAgBBrOYBKAIAIAJBBHRqKAIAIgRGBEAgAyQHDwsgASAENgIAIABBoARqIgUgACgCpAQiASIARgRAIAMkBw8LA0AgASgCCCgCFCICIAQ2AhggAigCDCIBIAIoAhAiAkcEQANAIAEgBDYCDCABQSxqIgEgAkcNAAsLIAUgACgCBCIBIgBHDQALIAMkBw8LIAFBjfWItH9IBEAgAUGSrPStf2sEQCADJAcPCyAEIAIQjAYiCjgCACAAKAKoAygCCEEUaiIBKgIAIApcBEAgASAKOAIAIABBoARqIgYgACgCpAQiASIARwRAIApDpHB9P14EfyAFBSAECyECA0AgASgCCCgCFCIEIAo4ArwBIAQoApwBIgEgBCgCoAEiBEcEQANAIAVDpHB9PzgCACAHQwrXIzw4AgAgASACKgIAQwrXIzxdBH8gBwUgAgsoAgA2AhQgAUEsaiIBIARHDQALCyAGIAAoAgQiASIARw0ACwsLIAMkBw8LIAFBgsuivn9IBEAgAUGN9Yi0f2sEQCADJAcPCyACEIwGIAAoAswEIgIqAgCTIAIqAgiUENACQwAAgL+SIQogACgCtAMoAghBEGoiASoCACACKgIEIAIqAhAgCpSSIgpbBEAgAyQHDwsgASAKOAIAIABBoARqIgIgACgCpAQiASIARgRAIAMkBw8LA0AgASgCCCgCICIFQZQDaiEBIAUsAKQDBEAgBSoCoANDAAAAAFsEQCABIAo4AgALBSAFIAUqApwDIAogASoCAJOLlDgCoAMLIAUgCjgCmAMgAiAAKAIEIgEiAEcNAAsgAyQHDwsgAUGCy6K+f2sEQCADJAcPCyACEIwGIQogACgCtAMoAgBBFGoiASoCACAKWwRAIAMkBw8LIAEgCjgCACAAQaAEaiIFIAAoAqQEIgAiAUYEQCADJAcPCwNAIAAoAggiAigCICIEKAKIASIAKgIIIAIqAsQDIAAqAhSUQ6uqqj2UuxAgtpQhDCAEQZABaiEAIAQsAKABBEAgBCoCnAEiCkMAAAAAWwR9IAAgDDgCACAMBSAAKgIACyELBSAEIAQqApgBIAwgACoCACILk4uUIgo4ApwBCyAEIAw4ApQBAkAgCyAMXAR9IAsgDF0EfSAAIAsgCpIiCjgCACAKIAxeRQ0CIAAgDDgCACAMBSAAIAsgCpMiCjgCACAKIAxdRQ0CIAAgDDgCACAMCwUgCwshCgsgBCAKOALMASAFIAEoAgQiACIBRw0ACyADJAcPCyABQeCgp8oATgRAIAFBx92P9ABOBEAgAUHu+t/7AEgEQCABQcfdj/QAawRAIAMkBw8LIAIQjAYhCiAAQfADaiIBKgIAIApbBEAgAyQHDwsgASAKOAIAIABBmAJqIAoQnwEgAEGgBGoiCCAAKAKkBCIBIgJGBEAgAyQHDwsgAEHoAmohByAAQeACaiEGIABB2AJqIQQgAEHwAmohBSACIQADQCABKAIIIgEgBysDADkDkAIgASAGKwMAOQOIAiABIAQrAwA5A4ACIAEgBSsDADkDmAIgCCAAKAIEIgEiAEcNAAsgAyQHDwsgAUHn0quGAU4EQCABQefSq4YBawRAIAMkBw8LIAIQjAYhCiAAKAL4AyAKOAIQIAMkBw8LIAFB7vrf+wBrBEAgAyQHDwsgAhCGBiEBIAAoAoAEIgJBlOYBKAIAIAFBBHRqKAIAIgE2AiggAgJ/AkAgAigCJCIARQ0AIABBqoQBEKABRg0AIAIqAhxDAAAAAFsNAEEBDAELIAEEfyABQaqEARCgAUYEf0EABSACKgIgQwAAAABcCwVBAAsLIgA6ABQgAyQHDwsgAUHOl7vQAEgEQCABQeCgp8oAawRAIAMkBw8LIAIQjAYiC4whCiAAKAKABCIBIAsgC0MAAAAAXQR9IAoFIAsLlCIKOAIcIAECfwJAIAEoAiQiAEUNACAAQaqEARCgAUcgCkMAAAAAXHFFDQBBAQwBCyABKAIoIgAEfyAAQaqEARCgAUYEf0EABSABKgIgQwAAAABcCwVBAAsLIgA6ABQgAyQHDwsgAUHM8/LSAE4EQCABQczz8tIAawRAIAMkBw8LIAIQhgYhASAFQbjmASgCACABQQR0aigCACICNgIAIAAoArQDKAIAIgEoAgAgAkcEQCABIAI2AgAgABCbASAAQaAEaiICIAAoAqQEIgEiAEcEQANAIAEoAggoAiAgBRDRASACIAAoAgQiASIARw0ACwsLIAMkBw8LIAFBzpe70ABrBEAgAyQHDwsgAhCGBiEBIAAoAoAEIgZBoOYBKAIAIAFBBHRqKAIAIgQ2AjggBkEVaiIFLAAAQQBHIQICQAJAIAYoAjQiAUUNACABQaqEARCgAUYNACAGKgIsQwAAAABbDQBBASEBDAELIAQEQCAEQaqEARCgAUcEQCAGKgIwQwAAAABcIQEMAgsLIAVBADoAACADJAcPCyAFIAE6AAAgAiABQf8BcUVyBEAgAyQHDwsgACgC+AMiASAAKQNQNwMYIAEgAUEQaiIEKAIAIgU2AiAgAEGgBGoiBiAAKAKkBCIAIgJGBEAgAyQHDwsgACgCCCIBQegCaiEAIAW+u0QAAABg+yEZQBAstiILQ9sPyUCSIQogACALQwAAAABdBH0gCgUgCyIKCzgCACABIAo4AvQCIAYgAigCBCIBIgBGBEAgAyQHDwsDQCABKAIIIgJB6AJqIQEgBCoCALtEAAAAYPshGUAQLLYiC0PbD8lAkiEKIAEgC0MAAAAAXQR9IAoFIAsiCgs4AgAgAiAKOAL0AiAGIAAoAgQiASIARw0ACyADJAcPCyABQZCn5TlIBEAgAUGMv9AYSARAIAFBn+3cDWsEQCADJAcPCyACEIYGIQIgACgCgARBEGoiASgCAEHQ5gEoAgAgAkEEdGooAgAiAEYEQCADJAcPCyABIAA2AgAgAyQHDwsgAUGklKgeTgRAIAFBpJSoHmsEQCADJAcPCyACEIwGIgogCpQhCiAAKAKoAygCAEEgaiIBKgIAIApbBEAgAyQHDwsgASAKOAIAIABBoARqIgIgACgCpAQiASIARgRAIAMkBw8LA0AgASgCCCgCFCgCaCIBLAAQBEAgASoCDEMAAAAAWwRAIAEgCjgCAAsFIAEgASoCCCAKIAEqAgCTi5Q4AgwLIAEgCjgCBCACIAAoAgQiASIARw0ACyADJAcPCyABQYy/0BhrBEAgAyQHDwsgAhCMBiAAKAK8BCICKgIAkyACKgIIlBDQAkMAAIC/kiEKIAAoArQDKAIIQQhqIgEqAgAgAioCBCACKgIQIAqUkiIKWwRAIAMkBw8LIAEgCjgCACAAQaAEaiIFIAAoAqQEIgAiAUYEQCADJAcPCwNAIAAoAggiAigCICIEKALkAiIAKgIIIAIqAsQDIAAqAhSUQ6uqqj2UuxAgtpQhDCAEQewCaiEAIAQsAPwCBEAgBCoC+AIiCkMAAAAAWwR9IAAgDDgCACAMBSAAKgIACyELBSAEIAQqAvQCIAwgACoCACILk4uUIgo4AvgCCyAEIAw4AvACAkAgCyAMXAR9IAsgDF0EfSAAIAsgCpIiCjgCACAKIAxeRQ0CIAAgDDgCACAMBSAAIAsgCpMiCjgCACAKIAxdRQ0CIAAgDDgCACAMCwUgCwshCgsgBCAKOAKoAyAFIAEoAgQiACIBRw0ACyADJAcPCyABQfrEj8kASARAIAFBkKflOWsEQCADJAcPCyACEIwGIAAoArQEIgIqAgCTIAIqAgiUENACQwAAgL+SIQogACgCqAMoAhBBGGoiASoCACACKgIEIAIqAhAgCpSSIgpbBEAgAyQHDwsgASAKOAIAIABBoARqIgIgACgCpAQiASIARgRAIAMkBw8LA0AgASgCCCgCFEGgAmogChCZASACIAAoAgQiASIARw0ACyADJAcPCyABQZKQ/MkASARAIAFB+sSPyQBrBEAgAyQHDwsgAhCMBiAAKALEBCICKgIAkyACKgIIlBDQAkMAAIC/kiEKIAAoArQDKAIAQQxqIgEqAgAgAioCBCACKgIQIAqUkiIKWwRAIAMkBw8LIAEgCjgCACAAQaAEaiIGIAAoAqQEIgAiAkYEQCADJAcPCwNAIAAoAggoAiAiB0GkAWohASAHKAKIAUEMaiEEIAcsALQBBH8gByoCsAEiCkMAAAAAWwR/IAEgBCgCACIFNgIAIAW+IQsgAQUgASoCACIMIQsgDLwhBSABCwUgByAHKgKsASAEKgIAIAEqAgAiC5OLlCIKOAKwASALvCEFIAELIQAgByAEKAIAIgQ2AqgBAkAgCyAEviIMXAR/IAsgDF0EfyAAIAogC5IiCjgCACAKvCEAIAogDF5FDQIgASAENgIAIAQFIAAgCyAKkyIKOAIAIAq8IQAgCiAMXUUNAiABIAQ2AgAgBAsFIAULIQALIAcgADYC0AEgBiACKAIEIgAiAkcNAAsgAyQHDwsgAUGSkPzJAGsEQCADJAcPCyACEIYGIQIgACgCqAMoAhBBEGoiAS0AALIgArJbBEAgAyQHDwsgASACQQBHIgIiCDoAACAAQaAEaiIHIAAoAqQEIgEiAEYEQCADJAcPCyACRQRAA0AgASgCCCgCFCICQcgCaiIBLAAAIAhHBEAgASAIOgAAIAIqAsACIQwgAigCrAIiASACKAKwAiIGRwRAA0AgDCABQRhqIgQqAgAgAUEcaiIFKgIAk5MiC0MAAAAAXiICBH1D2w9JQAVD2w9JwAshCiAFIAsgCpK7RAAAAGD7IRlAECy2IAIEfUPbD0nABUPbD0lAC5IiCjgCACABIAq7RPyp8dJNYlA/orY4AiAgBCAMOAIAIAFBLGoiASAGRw0ACwsLIAcgACgCBCIBIgBHDQALIAMkBw8LA0AgASgCCCgCFCIFQcgCaiIBLAAAIAhHBEAgASAIOgAAIAUqAsACIQogBSgCsAIiAiAFKAKsAiIBa0EsbSIFQQFLBH0gCiAFQX9qs5UFQwAAAAALIQ0gASACRwRAA0AgCiABQRhqIgYqAgAgAUEcaiIEKgIAk5MiDEMAAAAAXiIFBH1D2w9JQAVD2w9JwAshCyAEIAwgC5K7RAAAAGD7IRlAECy2IAUEfUPbD0nABUPbD0lAC5IiCzgCACABIAu7RPyp8dJNYlA/orY4AiAgBiAKOAIAIAogDZMhCiABQSxqIgEgAkcNAAsLCyAHIAAoAgQiASIARw0ACyADJAcPCyABQZqBmb8DTgRAIAFB5+Sq0AVIBEAgAUG1hLzHBEgEQCABQeHSjZAETgRAIAFBmtrswQRIBEAgAUHh0o2QBGsEQCADJAcPCyACEIwGIQogACgCqAMoAgAiAUGIAWoiACoCACAKWwRAIAMkBw8LIAEoAoABIgEEQCAFIAo4AgAgASAFIAEoAgAoAhhBP3FB3QRqEQUACyAAIAo4AgAgAyQHDwsgAUHp2avCBE4EQCABQenZq8IEawRAIAMkBw8LIAIQhgZBAEchASAAKAK0AygCCCABOgAZIAMkBw8LIAFBmtrswQRrBEAgAyQHDwsgAhCGBiEBIAAoAvgDIgVBrOYBKAIAIAFBBHRqKAIAIgI2AgAgAEGgBGoiBCAAKAKkBCIBIgBGBEAgAyQHDwsgASgCCCACNgLcAiAEIAAoAgQiASIARgRAIAMkBw8LA0AgASgCCCAFKAIANgLcAiAEIAAoAgQiASIARw0ACyADJAcPCyABQbD9rOgDSARAIAFBmoGZvwNrBEAgAyQHDwsgAhCGBiECIAAoArQDKAIIQQRqIgEoAgBBxOYBKAIAIAJBBHRqKAIAIgVGBEAgAyQHDwsgASAFNgIAIABBoARqIgIgACgCpAQiASIARgRAIAMkBw8LA0AgASgCCCgCICAFNgKAAiACIAAoAgQiASIARw0ACyADJAcPCyABQbD9rOgDawRAIAMkBw8LIAIQjAYiC4whCiAAKAKABCIEIAsgC0MAAAAAXQR9IAoFIAsLlCIKOAIsIARBFWoiBSwAAEEARyECAkACQCAEKAI0IgFFDQAgAUGqhAEQoAFHIApDAAAAAFxxRQ0AQQEhAQwBCyAEKAI4IgEEQCABQaqEARCgAUcEQCAEKgIwQwAAAABcIQEMAgsLIAVBADoAACADJAcPCyAFIAE6AAAgAiABQf8BcUVyBEAgAyQHDwsgACgC+AMiASAAKQNQNwMYIAEgAUEQaiIEKAIAIgU2AiAgAEGgBGoiBiAAKAKkBCIAIgJGBEAgAyQHDwsgACgCCCIBQegCaiEAIAW+u0QAAABg+yEZQBAstiILQ9sPyUCSIQogACALQwAAAABdBH0gCgUgCyIKCzgCACABIAo4AvQCIAYgAigCBCIBIgBGBEAgAyQHDwsDQCABKAIIIgJB6AJqIQEgBCoCALtEAAAAYPshGUAQLLYiC0PbD8lAkiEKIAEgC0MAAAAAXQR9IAoFIAsiCgs4AgAgAiAKOAL0AiAGIAAoAgQiASIARw0ACyADJAcPCyABQY2LuYwFTgRAIAFBoeDGkgVIBEAgAUGNi7mMBWsEQCADJAcPCyACEIwGIgogCpQhCiAAKAKoAygCEEEcaiIBKgIAIApbBEAgAyQHDwsgASAKOAIAIABBoARqIgIgACgCpAQiASIARgRAIAMkBw8LA0AgASgCCCgCFEGgAmogChCaASACIAAoAgQiASIARw0ACyADJAcPCyABQeOl9LYFSARAIAFBoeDGkgVrBEAgAyQHDwsgAhCMBiEKIAAoAqgDKAIIQSRqIgEqAgAgClsEQCADJAcPCyABIAo4AgAgAEGgBGoiAiAAKAKkBCIBIgBGBEAgAyQHDwsDQCABKAIIKAIUQZABaiAKEJgBIAIgACgCBCIBIgBHDQALIAMkBw8FIAFB46X0tgVrBEAgAyQHDwsgAhCGBgR9QwAAgL8FQwAAgD8LIQogACgCqAMoAhBBDGoiASoCACAKWwRAIAMkBw8LIAEgCjgCACAAQaAEaiICIAAoAqQEIgEiAEYEQCADJAcPCwNAIAEoAggoAhQgCjgCxAIgAiAAKAIEIgEiAEcNAAsgAyQHDwsACyABQaegh/QESARAIAFBtYS8xwRrBEAgAyQHDwsgAhCGBiECIAAoArQDKAIAQQRqIgEoAgBBxOYBKAIAIAJBBHRqKAIAIgVGBEAgAyQHDwsgASAFNgIAIABBoARqIgIgACgCpAQiASIARgRAIAMkBw8LA0AgASgCCCgCICAFNgIkIAIgACgCBCIBIgBHDQALIAMkBw8LIAFB66O+hQVOBEAgAUHro76FBWsEQCADJAcPCyACEIYGQQBHIQEgACgCqAMoAgAgAToAKCAAEJsBIAMkBw8LIAFBp6CH9ARrBEAgAyQHDwsgAhCMBiEKIABB5ANqIgEqAgAgClsEQCADJAcPCyABIAo4AgAgAEGYA2oiByAKIAqUuyIROQMAIABB2AJqIgZEAAAAAAAA8D8gEaEiECAAKwPQAiAAKwOoAqKiIhM5AwAgAEHwAmoiBAJ8IBNEAAAAAAAAAABhBHwgAEQAAAAAAAAAADkD4AJEAAAAAAAAAAAhDyARBSAAKwPoAiISRAAAAAAAAAAAYQRAIABEAAAAAAAA8D85A+ACRAAAAAAAAPA/IQ8gEUQAAAAAAADwv6AgE6MMAgsgE7YhC0QAAAAAAADwPyAStiIKu6MhDyAAIApDAAAAAF0EfEQAAAAAAADwPyAPoRDRAgUgD0QAAAAAAADwP6AQ0QKaCyIPIAu7oxDPAiIPOQPgAiAQIBKiIRAgEkQAAAAAAAAAAGQEfCARBUQAAAAAAADwPwsgEKFEAAAAAAAA8D8gD6GiCwsiEDkDACAAQaAEaiIIIAAoAqQEIgIiAUYEQCADJAcPCyAAQeACaiEFIAIoAggiCSAROQPAAiAJIABB6AJqIgIrAwA5A5ACIAkgDzkDiAIgCSATOQOAAiAJIBA5A5gCIAggASgCBCIBIgBGBEAgAyQHDwsDQCAFKwMAIREgBisDACEQIAQrAwAhDyABKAIIIgEgBysDADkDwAIgASACKwMAOQOQAiABIBE5A4gCIAEgEDkDgAIgASAPOQOYAiAIIAAoAgQiASIARw0ACyADJAcPCyABQZHUj+MGTgRAIAFBydndrQdOBEAgAUHNmJTHB0gEQCABQcnZ3a0HawRAIAMkBw8LIAIQhgYEfUMAAIC/BUMAAIA/CyEKIAAoAqgDKAIAQQxqIgEqAgAgClsEQCADJAcPCyABIAo4AgAgAEGgBGoiAiAAKAKkBCIBIgBGBEAgAyQHDwsDQCABKAIIKAIUIAo4AiQgAiAAKAIEIgEiAEcNAAsgAyQHDwsgAUHT7uvtB04EQCABQdPu6+0HawRAIAMkBw8LIAIQjAYiC4whCiAAKAKABCIBIAsgC0MAAAAAXQR9IAoFIAsLlCIKOAIgIAECfwJAIAEoAiQiAEUNACAAQaqEARCgAUYNACABKgIcQwAAAABbDQBBAQwBCyABKAIoIgAEfyAAQaqEARCgAUYEf0EABSAKQwAAAABcCwVBAAsLIgA6ABQgAyQHDwsgAUHNmJTHB2sEQCADJAcPCyAEIAIQjAYiCjgCACAAKAKoAygCEEEUaiIBKgIAIApcBEAgASAKOAIAIABBoARqIgYgACgCpAQiASIARwRAIApDpHB9P14EfyAFBSAECyECA0AgASgCCCgCFCIEIAo4AswCIAQoAqwCIgEgBCgCsAIiBEcEQANAIAVDpHB9PzgCACAHQwrXIzw4AgAgASACKgIAQwrXIzxdBH8gBwUgAgsoAgA2AhQgAUEsaiIBIARHDQALCyAGIAAoAgQiASIARw0ACwsLIAMkBw8LIAFBtpyF8gZOBEAgAUHx16f8Bk4EQCABQfHXp/wGawRAIAMkBw8LIAIQhgZBAEchASAAKAKoAygCECABOgAoIAAQmwEgAyQHDwsgAUG2nIXyBmsEQCADJAcPCyACEIYGIQIgACgCqAMoAggiASgCAEGs5gEoAgAgAkEEdGooAgAiBEYEQCADJAcPCyABIAQ2AgAgAEGgBGoiBSAAKAKkBCIBIgBGBEAgAyQHDwsDQCABKAIIKAIUIgIgBDYCqAEgAigCnAEiASACKAKgASICRwRAA0AgASAENgIMIAFBLGoiASACRw0ACwsgBSAAKAIEIgEiAEcNAAsgAyQHDwsgAUGR1I/jBmsEQCADJAcPCyACEIwGIQogAEHIA2oiASoCACAKWwRAIAMkBw8LIAEgCjgCACAAQYgCaiIHIAogCpS7IhE5AwAgAEHIAWoiBkQAAAAAAADwPyARoSIQIAArA8ABIAArA5gBoqIiEzkDACAAQeABaiIEAnwgE0QAAAAAAAAAAGEEfCAARAAAAAAAAAAAOQPQAUQAAAAAAAAAACEPIBEFIAArA9gBIhJEAAAAAAAAAABhBEAgAEQAAAAAAADwPzkD0AFEAAAAAAAA8D8hDyARRAAAAAAAAPC/oCATowwCCyATtiELRAAAAAAAAPA/IBK2Igq7oyEPIAAgCkMAAAAAXQR8RAAAAAAAAPA/IA+hENECBSAPRAAAAAAAAPA/oBDRApoLIg8gC7ujEM8CIg85A9ABIBAgEqIhECASRAAAAAAAAAAAZAR8IBEFRAAAAAAAAPA/CyAQoUQAAAAAAADwPyAPoaILCyIQOQMAIABBoARqIgggACgCpAQiAiIBRgRAIAMkBw8LIABB0AFqIQUgAigCCCIJIBE5A7ABIAkgAEHYAWoiAisDADkDgAEgCSAPOQN4IAkgEzkDcCAJIBA5A4gBIAggASgCBCIBIgBGBEAgAyQHDwsDQCAFKwMAIREgBisDACEQIAQrAwAhDyABKAIIIgEgBysDADkDsAEgASACKwMAOQOAASABIBE5A3ggASAQOQNwIAEgDzkDiAEgCCAAKAIEIgEiAEcNAAsgAyQHDwsgAUHt07+3Bk4EQCABQf38hskGSARAIAFB7dO/twZrBEAgAyQHDwsgAhCMBiEKIABB4ANqIgEqAgAgClsEQCADJAcPCyABIAo4AgAgCiAAKAKsBCIBKgIAkyABKgIIlBDQAkMAAIC/kiEKIABBmAJqIAEqAgQgASoCECAKlJIQnQEgAEGgBGoiCCAAKAKkBCIBIgJGBEAgAyQHDwsgAEHoAmohByAAQeACaiEGIABB2AJqIQQgAEHwAmohBSACIQADQCABKAIIIgEgBysDADkDkAIgASAGKwMAOQOIAiABIAQrAwA5A4ACIAEgBSsDADkDmAIgCCAAKAIEIgEiAEcNAAsgAyQHDwsgAUHFuonUBkgEQCABQf38hskGawRAIAMkBw8LIAIQhgYhBCAAKAKoAygCCEEEaiIBKAIAIARGBEAgAyQHDwsgASAENgIAIABBoARqIgIgACgCpAQiASIARgRAIAMkBw8LA0AgASgCCCgCFEGQAWohASAFIAQ2AgAgASAFEJcBIAIgACgCBCIBIgBHDQALIAMkBw8FIAFBxbqJ1AZrBEAgAyQHDwsgAhCMBiEKIABBwANqIgEqAgAgClsEQCADJAcPCyABIAo4AgAgCiAAKAKsBCIBKgIAkyABKgIIlBDQAkMAAIC/kiEKIABBiAFqIAEqAgQgASoCECAKlJIQnAEgAEGgBGoiCCAAKAKkBCIBIgJGBEAgAyQHDwsgAEGwAWohByAAQagBaiEGIABBoAFqIQQgAEG4AWohBSACIQADQCABKAIIIgEgBysDADkDWCABIAYrAwA5A1AgASAEKwMAOQNIIAEgBSsDADkDYCAIIAAoAgQiASIARw0ACyADJAcPCwALIAFB/KrH1QVIBEAgAUHn5KrQBWsEQCADJAcPCyAEIAIQjAYiCjgCACAAKAKoAygCAEEUaiIBKgIAIApcBEAgASAKOAIAIABBoARqIgYgACgCpAQiASIARwRAIApDpHB9P14EfyAFBSAECyECA0AgASgCCCgCFCIEIAo4AiwgBCgCDCIBIAQoAhAiBEcEQANAIAVDpHB9PzgCACAHQwrXIzw4AgAgASACKgIAQwrXIzxdBH8gBwUgAgsoAgA2AhQgAUEsaiIBIARHDQALCyAGIAAoAgQiASIARw0ACwsLIAMkBw8LIAFB8PK5pgZOBEAgAUHw8rmmBmsEQCADJAcPCyACEIwGIQwgACgCqAMoAgBBCGoiASoCACAMWwRAIAMkBw8LIAEgDDgCACAAQaAEaiIHIAAoAqQEIgEiAEYEQCADJAcPCwNAIAEoAggoAhQiBCAMOAIgIAQoAhAiAiAEKAIMIgFrQSxtIgVBAUsEfSAMIAVBf2qzlSEKIAQsACgEfSAKBUMAAAAACwVDAAAAAAshCyABIAJHBEAgDCEKA0AgCiABQRhqIgYqAgAgAUEcaiIEKgIAk5MiDkMAAAAAXiIFBH1D2w9JQAVD2w9JwAshDSAEIA4gDZK7RAAAAGD7IRlAECy2IAUEfUPbD0nABUPbD0lAC5IiDTgCACABIA27RPyp8dJNYlA/orY4AiAgBiAKOAIAIAogC5MhCiABQSxqIgEgAkcNAAsLIAcgACgCBCIBIgBHDQALIAMkBw8LIAFB/KrH1QVrBEAgAyQHDwsgAhCMBiIKIAAoAoAEQQxqIgEtAACyWwRAIAMkBw8LIAEgCkMAAAAAXCIBOgAAIAFFBEAgAEGIBGohBCAAQZAEaiIFKAIARQRAIAMkBw8LIAAoAowEIgAoAgAiAiAEKAIAQQRqIgEoAgA2AgQgASgCACACNgIAIAVBADYCACAAIARGBEAgAyQHDwsDQCAAKAIEIQEgABDhBSABIARHBEAgASEADAELCyADJAcPCyAAQaAEaiICIQECQCAAQaQEaiIEKAIAIAJGBEAgASEABSABIQADQAJAIAAoAgAiAigCCCEGIAIoAgwiB0UiBUUEQCAHQQRqIgIgAigCAEEBajYCAAsCQAJAAkAgBkEwaiICKAIADgYAAQEBAAABCwwBCwwBCyAGIAYrAzggBkFAaysDAEQAAABA4XqEP6KjOQO4ASACQQU2AgAgBUUEQCAHQQRqIgIoAgAhBSACIAVBf2o2AgAgBUUEQCAHIAcoAgAoAghB/wFxQdsCahEAACAHENsFCwsgBCgCACAAKAIAIgBHDQEgASEADAMLCyAAKAIAIQAgBUUEQCAHQQRqIgEoAgAhAiABIAJBf2o2AgAgAkUEQCAHIAcoAgAoAghB/wFxQdsCahEAACAHENsFCwsLCyAEKAIAIgEiBSAAIgJGBEAgAyQHDwsgBSEAA0AgASgCCCEEIAEoAgwiBQRAIAVBBGoiASABKAIAQQFqNgIAIAQgBCsDOCAEQUBrKwMARAAAAEDheoQ/oqM5A7gBIARBBTYCMCABIAEoAgAiAUF/ajYCACABRQRAIAUgBSgCACgCCEH/AXFB2wJqEQAAIAUQ2wULBSAEIAQrAzggBEFAaysDAEQAAABA4XqEP6KjOQO4ASAEQQU2AjALIAAoAgQiASIAIAJHDQALIAMkBw8LIAFBsqfwiQNIBEAgAUHfgq6/AUgEQCABQZiI4KABSARAIAFB866TmgFOBEAgAUHzrpOaAWsEQCADJAcPCyACEIYGIQIgACgCqAMoAgAiAUHIAGoiACgCACACRgRAIAMkBw8LIAFBQGsoAgAiAQRAIAUgAjYCACABIAUgASgCACgCGEE/cUHdBGoRBQALIAAgAjYCACADJAcPCyABQbHspYsBawRAIAMkBw8LIAIQhgYhAiAAKAKoAygCECIBKAIAQazmASgCACACQQR0aigCACIERgRAIAMkBw8LIAEgBDYCACAAQaAEaiIFIAAoAqQEIgEiAEYEQCADJAcPCwNAIAEoAggoAhQiAiAENgK4AiACKAKsAiIBIAIoArACIgJHBEADQCABIAQ2AgwgAUEsaiIBIAJHDQALCyAFIAAoAgQiASIARw0ACyADJAcPCyABQY2V6akBSARAIAFBmIjgoAFrBEAgAyQHDwsgAhCMBiEKIAAoAqgDKAIQIAo4AiwgAyQHDwsgAUH5/PK6AUgEQCABQY2V6akBawRAIAMkBw8LIAIQhgYhASAAKAKABCICQZTmASgCACABQQR0aigCACIANgIkIAICfwJAIABFDQAgAEGqhAEQoAFGDQAgAioCHEMAAAAAWw0AQQEMAQsgAigCKCIABH8gAEGqhAEQoAFGBH9BAAUgAioCIEMAAAAAXAsFQQALCyIAOgAUIAMkBw8LIAFB+fzyugFrBEAgAyQHDwsgAhCMBiEMIAAoAqgDKAIIQQhqIgEqAgAgDFsEQCADJAcPCyABIAw4AgAgAEGgBGoiByAAKAKkBCIBIgBGBEAgAyQHDwsDQCABKAIIKAIUIgQgDDgCsAEgBCgCoAEiAiAEKAKcASIBa0EsbSIFQQFLBH0gDCAFQX9qs5UhCiAELAC4AQR9IAoFQwAAAAALBUMAAAAACyELIAEgAkcEQCAMIQoDQCAKIAFBGGoiBioCACABQRxqIgQqAgCTkyIOQwAAAABeIgUEfUPbD0lABUPbD0nACyENIAQgDiANkrtEAAAAYPshGUAQLLYgBQR9Q9sPScAFQ9sPSUALkiINOAIAIAEgDbtE/Knx0k1iUD+itjgCICAGIAo4AgAgCiALkyEKIAFBLGoiASACRw0ACwsgByAAKAIEIgEiAEcNAAsgAyQHDwsgAUGb952ZAk4EQCABQZ36zLsCSARAIAFBm/edmQJrBEAgAyQHDwsgAhCMBiEKIAAoAqgDKAIQIgFBiAFqIgAqAgAgClsEQCADJAcPCyABKAKAASIBBEAgBSAKOAIAIAEgBSABKAIAKAIYQT9xQd0EahEFAAsgACAKOAIAIAMkBw8LIAFBsZGY4wJOBEAgAUGxkZjjAmsEQCADJAcPCyACEIwGIQogAEHUA2oiASoCACAKWwRAIAMkBw8LIAEgCjgCACAAQYgBaiAKEJ8BIABBoARqIgggACgCpAQiASICRgRAIAMkBw8LIABB2AFqIQcgAEHQAWohBiAAQcgBaiEEIABB4AFqIQUgAiEAA0AgASgCCCIBIAcrAwA5A4ABIAEgBisDADkDeCABIAQrAwA5A3AgASAFKwMAOQOIASAIIAAoAgQiASIARw0ACyADJAcPCyABQZ36zLsCawRAIAMkBw8LIAIQjAYhCiAAKAK0AygCCEEUaiIBKgIAIApbBEAgAyQHDwsgASAKOAIAIABBoARqIgUgACgCpAQiACIBRgRAIAMkBw8LA0AgACgCCCICKAIgIgQoAuQCIgAqAgggAioCxAMgACoCFJRDq6qqPZS7ECC2lCEMIARB7AJqIQAgBCwA/AIEQCAEKgL4AiIKQwAAAABbBH0gACAMOAIAIAwFIAAqAgALIQsFIAQgBCoC9AIgDCAAKgIAIguTi5QiCjgC+AILIAQgDDgC8AICQCALIAxcBH0gCyAMXQR9IAAgCyAKkiIKOAIAIAogDF5FDQIgACAMOAIAIAwFIAAgCyAKkyIKOAIAIAogDF1FDQIgACAMOAIAIAwLBSALCyEKCyAEIAo4AqgDIAUgASgCBCIAIgFHDQALIAMkBw8LIAFB99KKwAFIBEAgAUHfgq6/AWsEQCADJAcPCyACEIYGIQIgACgC+AMiBUEEaiIBLQAAsiACslsEQCADJAcPCyABIAJBAEciBjoAACAAKAKoBARAIAUgACkDUDcDGCAFIAAoAqQEIgEoAggoAvQCNgIgBSAAKAKkBCEBCyAAQaAEaiIIIAEiAEYEQCADJAcPCyAFQQhqIQdBjOYBKAIAQYjmASgCACICa0EYbSIEQX9qIQUgBLMhCyAGRQRAA0AgASgCCCIBIAcqAgBDAACgQZQiCjgC4AIgASAKIAEqAtQClDgC+AIgCCAAKAIEIgEiAEcNAAsgAyQHDwsDQCABKAIIIgQrA4gDtiEKIAQgAiAHKgIAIgxDAACAP2AEfyAFBSAMQwAAAABfBH9BAAUgDCALlKgLCyIBQRhsaisDACAKu6K2Igo4AuACIAQgBCoC1AIgCpQ4AvgCIAggACgCBCIBIgBHDQALIAMkBw8LIAFBxqGBlwJOBEAgAUHGoYGXAmsEQCADJAcPCyACEIwGIQogACgCqAMoAgAgCjgCLCADJAcPCyABQffSisABawRAIAMkBw8LIAIQhgYhASAAKAKABCIEQaDmASgCACABQQR0aigCACIBNgI0IARBFWoiBSwAAEEARyECAkACQCABRQ0AIAFBqoQBEKABRg0AIAQqAixDAAAAAFsNAEEBIQEMAQsgBCgCOCIBBEAgAUGqhAEQoAFHBEAgBCoCMEMAAAAAXCEBDAILCyAFQQA6AAAgAyQHDwsgBSABOgAAIAIgAUH/AXFFcgRAIAMkBw8LIAAoAvgDIgEgACkDUDcDGCABIAFBEGoiBCgCACIFNgIgIABBoARqIgYgACgCpAQiACICRgRAIAMkBw8LIAAoAggiAUHoAmohACAFvrtEAAAAYPshGUAQLLYiC0PbD8lAkiEKIAAgC0MAAAAAXQR9IAoFIAsiCgs4AgAgASAKOAL0AiAGIAIoAgQiASIARgRAIAMkBw8LA0AgASgCCCICQegCaiEBIAQqAgC7RAAAAGD7IRlAECy2IgtD2w/JQJIhCiABIAtDAAAAAF0EfSAKBSALIgoLOAIAIAIgCjgC9AIgBiAAKAIEIgEiAEcNAAsgAyQHDwsgAUHTuaKXA0gEQCABQdni/JADSARAIAFB1fKbkANOBEAgAUHV8puQA2sEQCADJAcPCyACEIYGIQIgACgCqAMoAhAiAUHoAGoiACgCACACRgRAIAMkBw8LIAEoAmAiAQRAIAUgAjYCACABIAUgASgCACgCGEE/cUHdBGoRBQALIAAgAjYCACADJAcPCyABQbKn8IkDawRAIAMkBw8LIAIQjAYgACgCzAQiAioCAJMgAioCCJQQ0AJDAACAv5IhCiAAKAK0AygCAEEQaiIBKgIAIAIqAgQgAioCECAKlJIiClsEQCADJAcPCyABIAo4AgAgAEGgBGoiAiAAKAKkBCIBIgBGBEAgAyQHDwsDQCABKAIIKAIgIgVBuAFqIQEgBSwAyAEEQCAFKgLEAUMAAAAAWwRAIAEgCjgCAAsFIAUgBSoCwAEgCiABKgIAk4uUOALEAQsgBSAKOAK8ASACIAAoAgQiASIARw0ACyADJAcPCyABQbLrw5QDSARAIAFB2eL8kANrBEAgAyQHDwsgAhCGBiECIAAoAqgDKAIQIgFByABqIgAoAgAgAkYEQCADJAcPCyABQUBrKAIAIgEEQCAFIAI2AgAgASAFIAEoAgAoAhhBP3FB3QRqEQUACyAAIAI2AgAgAyQHDwsgAUGnscmVA04EQCABQaexyZUDawRAIAMkBw8LIAIQjAYiCiAKlCEKIAAoAqgDKAIAQRxqIgEqAgAgClsEQCADJAcPCyABIAo4AgAgAEGgBGoiAiAAKAKkBCIBIgBGBEAgAyQHDwsDQCABKAIIKAIUIAoQmgEgAiAAKAIEIgEiAEcNAAsgAyQHDwsgAUGy68OUA2sEQCADJAcPCyACEIwGIgogCpQhCiAAKAKoAygCEEEgaiIBKgIAIApbBEAgAyQHDwsgASAKOAIAIABBoARqIgIgACgCpAQiASIARgRAIAMkBw8LA0AgASgCCCgCFCgCiAMiASwAEARAIAEqAgxDAAAAAFsEQCABIAo4AgALBSABIAEqAgggCiABKgIAk4uUOAIMCyABIAo4AgQgAiAAKAIEIgEiAEcNAAsgAyQHDwsgAUGdmKCjA04EQCABQZikkqkDSARAIAFBnZigowNrBEAgAyQHDwsgAhCMBiILjCEKIAAoAoAEIgQgCyALQwAAAABdBH0gCgUgCwuUIgo4AjAgBEEVaiIFLAAAQQBHIQICQAJAIAQoAjQiAUUNACABQaqEARCgAUYNACAEKgIsQwAAAABbDQBBASEBDAELIAQoAjgiAQRAIAFBqoQBEKABRwRAIApDAAAAAFwhAQwCCwsgBUEAOgAAIAMkBw8LIAUgAToAACACIAFB/wFxRXIEQCADJAcPCyAAKAL4AyIBIAApA1A3AxggASABQRBqIgQoAgAiBTYCICAAQaAEaiIGIAAoAqQEIgAiAkYEQCADJAcPCyAAKAIIIgFB6AJqIQAgBb67RAAAAGD7IRlAECy2IgtD2w/JQJIhCiAAIAtDAAAAAF0EfSAKBSALIgoLOAIAIAEgCjgC9AIgBiACKAIEIgEiAEYEQCADJAcPCwNAIAEoAggiAkHoAmohASAEKgIAu0QAAABg+yEZQBAstiILQ9sPyUCSIQogASALQwAAAABdBH0gCgUgCyIKCzgCACACIAo4AvQCIAYgACgCBCIBIgBHDQALIAMkBw8LIAFB/v+AsANOBEAgAUH+/4CwA2sEQCADJAcPCyACEIwGIAAoArQEIgIqAgCTIAIqAgiUENACQwAAgL+SIQogACgCqAMoAgBBGGoiASoCACACKgIEIAIqAhAgCpSSIgpbBEAgAyQHDwsgASAKOAIAIABBoARqIgIgACgCpAQiASIARgRAIAMkBw8LA0AgASgCCCgCFCAKEJkBIAIgACgCBCIBIgBHDQALIAMkBw8LIAFBmKSSqQNrBEAgAyQHDwsgAhCMBiEKIABB2ANqIgEqAgAgClsEQCADJAcPCyABIAo4AgAgAEH4AWoiByAKIApDAAAAAF0EfUMAAIC/BUMAAIA/CyILlEMAAABBlCIKu0SN7bWg98awPmMEfEQAAAAAAAAAAAVEAAAAAAAA8D8gCkMAAIA9lEMAAIA/kiIKIAqUIgogCpQiCiAKlCIKIAqUQwAAgL+Su6MgC7uiCyISOQMAIABBgAJqIgQCfCAAQegBaiIGKwMAIhBEAAAAAAAAAABhBHwgAEQAAAAAAAAAADkD8AFEAAAAAAAAAAAhD0QAAAAAAAAAAAUgEkQAAAAAAAAAAGEEQCAARAAAAAAAAPA/OQPwAUQAAAAAAADwPyEPRAAAAAAAAPC/IBCjDAILIBC2IQtEAAAAAAAA8D8gErYiCrujIQ8gACAKQwAAAABdBHxEAAAAAAAA8D8gD6EQ0QIFIA9EAAAAAAAA8D+gENECmgsiDyALu6MQzwIiDzkD8AEgEkQAAAAAAAAAAGQEfEQAAAAAAAAAgAVEAAAAAAAA8D8LIBKhRAAAAAAAAPA/IA+hogsLIhE5AwAgAEGgBGoiCCAAKAKkBCIFIgFGBEAgAyQHDwsgAEHwAWohAiAFKAIIIgAgEjkDoAEgACAPOQOYASAAIBA5A5ABIAAgETkDqAEgCCABKAIEIgEiAEYEQCADJAcPCwNAIAIrAwAhESAGKwMAIRAgBCsDACEPIAEoAggiASAHKwMAOQOgASABIBE5A5gBIAEgEDkDkAEgASAPOQOoASAIIAAoAgQiASIARw0ACyADJAcPCyABQdL0mZgDSARAIAFB07milwNrBEAgAyQHDwsgAhCMBiAAKAK8BCICKgIAkyACKgIIlBDQAkMAAIC/kiEKIAAoArQDKAIAQQhqIgEqAgAgAioCBCACKgIQIAqUkiIKWwRAIAMkBw8LIAEgCjgCACAAQaAEaiIFIAAoAqQEIgAiAUYEQCADJAcPCwNAIAAoAggiAigCICIEKAKIASIAKgIIIAIqAsQDIAAqAhSUQ6uqqj2UuxAgtpQhDCAEQZABaiEAIAQsAKABBEAgBCoCnAEiCkMAAAAAWwR9IAAgDDgCACAMBSAAKgIACyELBSAEIAQqApgBIAwgACoCACILk4uUIgo4ApwBCyAEIAw4ApQBAkAgCyAMXAR9IAsgDF0EfSAAIAsgCpIiCjgCACAKIAxeRQ0CIAAgDDgCACAMBSAAIAsgCpMiCjgCACAKIAxdRQ0CIAAgDDgCACAMCwUgCwshCgsgBCAKOALMASAFIAEoAgQiACIBRw0ACyADJAcPCyABQZWK35sDTgRAIAFBlYrfmwNrBEAgAyQHDwsgAhCMBiAAKALEBCICKgIAkyACKgIIlBDQAkMAAIC/kiEKIAAoArQDKAIIQQxqIgEqAgAgAioCBCACKgIQIAqUkiIKWwRAIAMkBw8LIAEgCjgCACAAQaAEaiIGIAAoAqQEIgAiAkYEQCADJAcPCwNAIAAoAggoAiAiB0GAA2ohASAHKALkAkEMaiEEIAcsAJADBH8gByoCjAMiCkMAAAAAWwR/IAEgBCgCACIFNgIAIAW+IQsgAQUgASoCACIMIQsgDLwhBSABCwUgByAHKgKIAyAEKgIAIAEqAgAiC5OLlCIKOAKMAyALvCEFIAELIQAgByAEKAIAIgQ2AoQDAkAgCyAEviIMXAR/IAsgDF0EfyAAIAogC5IiCjgCACAKvCEAIAogDF5FDQIgASAENgIAIAQFIAAgCyAKkyIKOAIAIAq8IQAgCiAMXUUNAiABIAQ2AgAgBAsFIAULIQALIAcgADYCrAMgBiACKAIEIgAiAkcNAAsgAyQHDwsgAUHS9JmYA2sEQCADJAcPCyACEIwGIQogAEH0A2oiASoCACAKWwRAIAMkBw8LIAEgCjgCACAAQYgDaiIHIAogCkMAAAAAXQR9QwAAgL8FQwAAgD8LIguUQwAAAEGUIgq7RI3ttaD3xrA+YwR8RAAAAAAAAAAABUQAAAAAAADwPyAKQwAAgD2UQwAAgD+SIgogCpQiCiAKlCIKIAqUIgogCpRDAACAv5K7oyALu6ILIhI5AwAgAEGQA2oiBAJ8IABB+AJqIgYrAwAiEEQAAAAAAAAAAGEEfCAARAAAAAAAAAAAOQOAA0QAAAAAAAAAACEPRAAAAAAAAAAABSASRAAAAAAAAAAAYQRAIABEAAAAAAAA8D85A4ADRAAAAAAAAPA/IQ9EAAAAAAAA8L8gEKMMAgsgELYhC0QAAAAAAADwPyAStiIKu6MhDyAAIApDAAAAAF0EfEQAAAAAAADwPyAPoRDRAgUgD0QAAAAAAADwP6AQ0QKaCyIPIAu7oxDPAiIPOQOAAyASRAAAAAAAAAAAZAR8RAAAAAAAAACABUQAAAAAAADwPwsgEqFEAAAAAAAA8D8gD6GiCwsiETkDACAAQaAEaiIIIAAoAqQEIgUiAUYEQCADJAcPCyAAQYADaiECIAUoAggiACASOQOwAiAAIA85A6gCIAAgEDkDoAIgACAROQO4AiAIIAEoAgQiASIARgRAIAMkBw8LA0AgAisDACERIAYrAwAhECAEKwMAIQ8gASgCCCIBIAcrAwA5A7ACIAEgETkDqAIgASAQOQOgAiABIA85A7gCIAggACgCBCIBIgBHDQALIAMkBwvaDAIbfwR9IwchDSMHQRBqJAcgDUEEaiEJIA0hESAAQRBqIgcoAgAiBCAAQQxqIgwoAgAiBmtBLG0hAyAEIQIgAyABKAIAIgVGBEAgDSQHDwsCQCADIAVJBEAgAEEUaiESIABBLGohEyAAQRhqIRYgAEE8aiEXIABBxABqIQ4gAEHIAGohGCAAQdAAaiEPIABB1ABqIRkgAEFAayEaIABBzABqIRsgAiEDIAYhAgJAAkACQANAIBIoAgAiBiEFIAMgBkkEfyADIAAoAgA2AgAgA0PbD8lAIAAqAgCVIh04AgggA0EBNgIMIANDAAAAADgCECADQwAAAD84AhQgA0EYaiICQgA3AgAgAkIANwIIIAJBADYCECADIB04AgQgByAHKAIAQSxqIgI2AgAgAgUgAiEGIAQgAmtBLG0iCEEBaiIDQd3oxS5LDQIgBSACa0EsbSIFQa70ohdJIQogBUEBdCIFIANPBEAgBSEDCyAKBH8gAwVB3ejFLiIDCwR/IANB3ejFLksNBCADQSxsEOAFBUEACyIFIANBLGxqIRwgBSAIQSxsaiIDIAAoAgAiCjYCACAFIAhBLGxqQ9sPyUAgCr6VIh04AgggBSAIQSxsakEBNgIMIAUgCEEsbGpDAAAAADgCECAFIAhBLGxqQwAAAD84AhQgBSAIQSxsakEYaiIKQgA3AgAgCkIANwIIIApBADYCECAFIAhBLGxqIB04AgQgA0EsaiEFIAQgBkcEQCADIQIDQCACQVRqIgIgBEFUaiIEKQIANwIAIAIgBCkCCDcCCCACIAQpAhA3AhAgAiAEKQIYNwIYIAIgBCkCIDcCICACIAQoAig2AiggBCAGRw0ACyACIQMgDCgCACECCyAMIAM2AgAgByAFNgIAIBIgHDYCACACBH8gAhDhBSAHKAIABSAFCyICCyIEIAwoAgAiBGsiA0EsRgRAIAlDpHB9PzgCACATKgIAQ6RwfT9eBH8gCQUgEwshBCARQwrXIzw4AgAgAkFoaiAEKgIAQwrXIzxdBH8gEQUgBAsoAgA2AgAgAkFgaiAWKAIANgIAIAJBZGogFyoCACIdOAIAIAJBfGogHSACQVhqKgIAlDgCAAUgAkFUaiICIAQgA0EsbUF+akEsbGoiBCkCADcCACACIAQpAgg3AgggAiAEKQIQNwIQIAIgBCkCGDcCGCACIAQpAiA3AiAgAiAEKAIoNgIoCyAJIAAqAgBDCtcjPJQiHTgCACAOKAIAIgIgGCgCAEkEQCACQwAAAAA4AgAgAkMAAAAAOAIEIAJDAACAPyAdlTgCCCACQwAAAAA4AgwgAkEAOgAQIA4gAkEUajYCAAUgGiAJEKIBIAAqAgBDCtcjPJQhHQsgCSAdOAIAIA8oAgAiAiAZKAIASQRAIAJDAAAAADgCACACQwAAAAA4AgQgAkMAAIA/IB2VOAIIIAJDAAAAADgCDCACQQA6ABAgDyACQRRqIgI2AgAFIBsgCRCiASAPKAIAIQILIA4oAgAiBEFsakEANgIAIARBcGpBADYCACACQWxqQQA2AgAgAkFwakEANgIAIAcoAgAiBCAMKAIAIgZrQSxtIQMgBCECIAMgASgCACIFSQRAIAIhAyAGIQIMAQUgBSEQIAYhFCADIRUgAiELDAYLAAsACxCsBAwBC0EIEAUiAUGliAEQ5AUgAUHw5AA2AgAgAUGYGUGRARAHCwUgBSEQIAYhFCADIRUgAiELCwsgFSAQSwRAIABBxABqIgQoAgAhASAAQdAAaiIDKAIAIQIDQCABQWxqIQEgAkFsaiECIAtBVGoiCyAUa0EsbSAQSw0ACyAHIAs2AgAgBCABNgIAIAMgAjYCAAsgACAAKgIwEJkBIAAqAiAhHSAHKAIAIgIgDCgCACIBa0EsbSIEQQFLBEAgHSAEQX9qs5UhHiAALAAoRQRAQwAAAAAhHgsFQwAAAAAhHgsgASACRwRAA0AgHSABQRhqIgQqAgAgAUEcaiILKgIAk5MiH0MAAAAAXiIDBH1D2w9JQAVD2w9JwAshICALIB8gIJK7RAAAAGD7IRlAECy2IAMEfUPbD0nABUPbD0lAC5IiHzgCACABIB+7RPyp8dJNYlA/orY4AiAgBCAdOAIAIB0gHpMhHSABQSxqIgEgAkcNAAsLIAAQoQEgDSQHC7sCAgJ/An0gAUMAAIA/XiECIAFDAACAv10EQEMAAIC/IQELIABBOGoiAyoCACACBH1DAACAPyIBBSABC1sEQA8LIAMgATgCACABQ9sPST+UQ9sPST+SIgRD2w/JP5JDg/kiQpQiAagiAkECdEHIH2oqAgAiBSABIAKykyACQQJ0QcwfaioCACAFk5SSIQEgACgCWCICLAAQBEAgAioCDEMAAAAAWwRAIAIgATgCAAsFIAIgAioCCCABIAIqAgCTi5Q4AgwLIAIgATgCBCAEQ4P5IkKUIgGoIgJBAnRByB9qKgIAIgQgASACspMgAkECdEHMH2oqAgAgBJOUkiEBIAAoAmAiACwAEARAIAAqAgxDAAAAAFsEQCAAIAE4AgALBSAAIAAqAgggASAAKgIAk4uUOAIMCyAAIAE4AgQLrwMCBH8EfSABQwAAAABdIQIgAUMAAIA/XgRAQwAAgD8hAQsgACACBH1DAAAAACIBBSABCzgCMCAAKAIQIAAoAgwiAmsiBEEsbSEFIARBLEYEQCACIAIqAggiATgCBCACIAEgAioCEJQ4AigPCyABQwAAAEAgBUF/aiIDsyIGlZQhCSAGQwAAAD+UIgeoIQAgByAAslsEQCACIABBLGxqIAIgAEEsbGoqAggiBjgCBCACIABBLGxqIAYgAiAAQSxsaioCEJQ4AigLIARFBEAPC0EAIQAgAYwhBgNAIAIgACAHIACzW2oiAEEsbGoqAgghCCACIABBLGxqIAZDq6qqPZS7ECC2IAiUIgg4AgQgAiAAQSxsaiAIIAIgAEEsbGoqAhCUOAIoIAkgBpIhBiAAQQJqIgAgBUkNAAsgBEEsTARADwsgAyEAA0AgAiAAIAcgALJbQR90QR91aiIDQSxsaioCCCEGIAIgA0EsbGogAUOrqqo9lLsQILYgBpQiBjgCBCACIANBLGxqIAYgAiADQSxsaioCEJQ4AiggASAJkyEBIANBfmohACADQQJKDQALC9YBAQV/IwchAiMHQfAPaiQHIAJBgAhqIQUgAkHoB2ohAyACIQQgAkGICGohBiABQwAAAABgRSABQwAAgD9fRXIEQCAGQegHQZ2HASAEEKACGiADIAY2AgAgA0HZhwE2AgQgA0HjhAE2AgggA0GEBDYCDCADQfOHATYCECAEQegHQfWiASADEKACGiAFQcSkATYCACAFIAQ2AgRBBCAFEB1BsNkBQeOEAUGEBEGbiAEQBAsgAEE0aiIEKgIAIAFbBEAgAiQHDwsgBCABOAIAIAAQoQEgAiQHC6gHAQl/AkAgACgCqAMiAyAAKAKsAyICRgRAQQAhAQUDQCADKAIAIgQsACgEQCAEKAIEBEBBASEBDAQLCyADQQhqIgMgAkcNAEEAIQELCwsgAEG0A2oiBygCACIDIQIgAEG4A2oiCCgCACIEIANGBEAPCyAAQaQEaiEJIABBoARqIQYgAUUEQEEAIQEgAyEAIAQhAwNAIAIgAUEDdGooAgBBADoAGCAGIAkoAgAiAiIERwRAIAIhACAEIQMDQCAAQQhqIgQoAgAoAiAiACABQdwBbGooAjAhAiAAIAFB3AFsaigCNCACayIFQQBKBEAgAkEAIAUQvwYaCyAAIAFB3AFsaigCRCAAIAFB3AFsakFAaygCACICayIFQQBKBEAgAkEAIAUQvwYaCyAAIAFB3AFsaigCVCAAIAFB3AFsaigCUCICayIFQQBKBEAgAkEAIAUQvwYaCyAAIAFB3AFsaigCZCAAIAFB3AFsaigCYCIAayICQQBKBEAgAEEAIAIQvwYaCyAEKAIAKAIgIgAgAUHcAWxqIAAgAUHcAWxqKAKUATYCkAEgACABQdwBbGogACABQdwBbGooAqgBNgKkASAAIAFB3AFsaiAAIAFB3AFsaigCvAE2ArgBIAYgAygCBCIAIgNHDQALIAgoAgAhAyAHKAIAIQALIAAhAiABQQFqIgEgAyAAa0EDdUkNAAsPC0EAIQEgAyEAIAQhAwNAIAIgAUEDdGooAgAiBCgCAEEHRyECIAQgAjoAGCACRQRAIAYgCSgCACICIgRHBEAgAiEAIAQhAwNAIABBCGoiBCgCACgCICIAIAFB3AFsaigCMCECIAAgAUHcAWxqKAI0IAJrIgVBAEoEQCACQQAgBRC/BhoLIAAgAUHcAWxqKAJEIAAgAUHcAWxqQUBrKAIAIgJrIgVBAEoEQCACQQAgBRC/BhoLIAAgAUHcAWxqKAJUIAAgAUHcAWxqKAJQIgJrIgVBAEoEQCACQQAgBRC/BhoLIAAgAUHcAWxqKAJkIAAgAUHcAWxqKAJgIgBrIgJBAEoEQCAAQQAgAhC/BhoLIAQoAgAoAiAiACABQdwBbGogACABQdwBbGooApQBNgKQASAAIAFB3AFsaiAAIAFB3AFsaigCqAE2AqQBIAAgAUHcAWxqIAAgAUHcAWxqKAK8ATYCuAEgBiADKAIEIgAiA0cNAAsgCCgCACEDIAcoAgAhAAsLIAAhAiABQQFqIgEgAyAAa0EDdUkNAAsLrQMDBX8BfQN8IwchAiMHQfAPaiQHIAJBgAhqIQQgAkHoB2ohAyACIQUgAkGICGohBiABQwAAAABgRQRAIAZB6AdBu4YBIAUQoAIaIAMgBjYCACADQdmEATYCBCADQeOEATYCCCADQc8ENgIMIANB54YBNgIQIAVB6AdB9aIBIAMQoAIaIARBxKQBNgIAIAQgBTYCBEEEIAQQHUGw2QFB44QBQc8EQY+HARAECyAAIAArAxAgAbuiIgg5AxggCEQAAAAAAAAAAGEEQCAARAAAAAAAAAAAOQMgIABEAAAAAAAA8D85AzAgAiQHDwsgACsDKCIJRAAAAAAAAAAAYQRAIABEAAAAAAAA8D85AyAgAEQAAAAAAADwPyAIozkDMCACJAcPCyAItiEHRAAAAAAAAPA/IAm2IgG7oyEIIAAgAUMAAAAAXQR8RAAAAAAAAPA/IAihENECBSAIRAAAAAAAAPA/oBDRApoLIgggB7ujEM8CIgo5AyAgCUQAAAAAAADwP6AhCCAAIAlEAAAAAAAAAABkBHwgCAUgCQtEAAAAAAAA8D8gCqGiOQMwIAIkBwvNAwMFfwF9BHwjByECIwdB8A9qJAcgAkGACGohBCACQegHaiEDIAIhBSACQYgIaiEGIAFDAAAAAGBFBEAgBkHoB0HchQEgBRCgAhogAyAGNgIAIANB2YQBNgIEIANB44QBNgIIIANB/QQ2AgwgA0GHhgE2AhAgBUHoB0H1ogEgAxCgAhogBEHEpAE2AgAgBCAFNgIEQQQgBBAdQbDZAUHjhAFB/QRBroYBEAQLIAAgAbsiCTkDOCAAQUBrIAArAxAgCaJEAAAAAAAA8D8gACsDgAEiCqEiCaIiCDkDACAIRAAAAAAAAAAAYQRAIABEAAAAAAAAAAA5A0ggACAKOQNYIAIkBw8LIAArA1AiC0QAAAAAAAAAAGEEQCAARAAAAAAAAPA/OQNIIAAgCkQAAAAAAADwv6AgCKM5A1ggAiQHDwsgCLYhB0QAAAAAAADwPyALtiIBu6MhCCAAIAFDAAAAAF0EfEQAAAAAAADwPyAIoRDRAgUgCEQAAAAAAADwP6AQ0QKaCyIIIAe7oxDPAiIIOQNIIAkgC6IhCSAAIAtEAAAAAAAAAABkBHwgCgVEAAAAAAAA8D8LIAmhRAAAAAAAAPA/IAihojkDWCACJAcLsAMDBX8BfQJ8IwchAiMHQfAPaiQHIAJBgAhqIQQgAkHoB2ohAyACIQUgAkGICGohBiABQwAAAABgRQRAIAZB6AdBrIQBIAUQoAIaIAMgBjYCACADQdmEATYCBCADQeOEATYCCCADQaUFNgIMIANBpIUBNgIQIAVB6AdB9aIBIAMQoAIaIARBxKQBNgIAIAQgBTYCBEEEIAQQHUGw2QFB44QBQaUFQc2FARAECyAAIAArAxAgAbuiIgg5A2AgCEQAAAAAAAAAAGEEQCAARAAAAAAAAAAAOQNoIABEAAAAAAAAAAA5A3ggAiQHDwsgACsDcCIJRAAAAAAAAAAAYQRAIABEAAAAAAAA8D85A2ggAEQAAAAAAADwvyAIozkDeCACJAcPCyAItiEHRAAAAAAAAPA/IAm2IgG7oyEIIAAgAUMAAAAAXQR8RAAAAAAAAPA/IAihENECBSAIRAAAAAAAAPA/oBDRApoLIgggB7ujEM8CIgg5A2ggACAJRAAAAAAAAAAAZAR8RAAAAAAAAACABUQAAAAAAADwPwsgCaFEAAAAAAAA8D8gCKGiOQN4IAIkBwuJAwIBfQR8IAAgAUMAAAAAXQR9QwAAgL8FQwAAgD8LIgIgAZRDAAAAQZQiAbtEje21oPfGsD5jBHxEAAAAAAAAAAAFRAAAAAAAAPA/IAFDAACAPZRDAACAP5IiASABlCIBIAGUIgEgAZQiASABlEMAAIC/krujIAK7ogsiBDkDUCAAQUBrIAArAzggACsDEKJEAAAAAAAA8D8gACsDgAEiBaEiBqIiAzkDACADRAAAAAAAAAAAYQRAIABEAAAAAAAAAAA5A0ggACAFOQNYDwsgBEQAAAAAAAAAAGEEQCAARAAAAAAAAPA/OQNIIAAgBUQAAAAAAADwv6AgA6M5A1gPCyADtiEBRAAAAAAAAPA/IAS2IgK7oyEDIAAgAkMAAAAAXQR8RAAAAAAAAPA/IAOhENECBSADRAAAAAAAAPA/oBDRApoLIgMgAbujEM8CIgM5A0ggBiAEoiEGIAAgBEQAAAAAAAAAAGQEfCAFBUQAAAAAAADwPwsgBqFEAAAAAAAA8D8gA6GiOQNYCyYBAX8gACwAACIBBH8gAEEBahCgAUGTg4AIbCABcwVBxbvyiHgLC40EAgR/A30gACgCDCIBIAAoAhAiAkYEQA8LIAIgAWsiAUEsbSEEIAFBLEYEQCAAQUBrKAIAIgEsABAEQCABKgIMQwAAAABbBEAgAUGAgID4AzYCAAsFIAEgASoCCEMAAAA/IAEqAgCTi5Q4AgwLIAFBgICA+AM2AgQgACgCTCIALAAQBEAgACoCDEMAAAAAWwRAIABBgICA+AM2AgALBSAAIAAqAghDAAAAPyAAKgIAk4uUOAIMCyAAQYCAgPgDNgIEDwsgACoCNEMAACBBlCAEQX9qs0MAAAA/lCIGlSEHIAFFBEAPCyAAQUBrKAIAIQEgACgCTCECQQAhAANAQwAAgD9DAACAPyAHIAYgALOTlEMAAIA9lJMiBSAFlCIFIAWUIgUgBZQiBSAFlEMAAIA/kpUhBSABIABBFGxqIQMgASAAQRRsaiwAEARAIAEgAEEUbGoqAgxDAAAAAFsEQCADIAU4AgALBSABIABBFGxqIAEgAEEUbGoqAgggBSADKgIAk4uUOAIMCyABIABBFGxqIAU4AgQgAiAAQRRsaiEDQwAAgD8gBZMhBSACIABBFGxqLAAQBEAgAiAAQRRsaioCDEMAAAAAWwRAIAMgBTgCAAsFIAIgAEEUbGogAiAAQRRsaioCCCAFIAMqAgCTi5Q4AgwLIAIgAEEUbGogBTgCBCAAQQFqIgAgBEkNAAsLhAMBC38gAEEEaiIKKAIAIgggACgCACIFa0EUbSIGQQFqIQIgBSEJIAJBzJmz5gBLBEAQrAQLIABBCGoiCygCACAFa0EUbSIDQebMmTNJIQcgA0EBdCIDIAJPBEAgAyECCyAHBH8gAgVBzJmz5gAiAgsEQCACQcyZs+YASwRAQQgQBSIDQaWIARDkBSADQfDkADYCACADQZgZQZEBEAcFIAJBFGwQ4AUhBAsFQQAhBAsgBCACQRRsaiEMIAQgBkEUbGoiA0MAAAAAOAIAIAQgBkEUbGpDAAAAADgCBCAEIAZBFGxqQwAAgD8gASoCAJU4AgggBCAGQRRsakMAAAAAOAIMIAQgBkEUbGpBADoAECADQRRqIQcgCCAJRgRAIAMhAQUgCCECIAMhAQNAIAFBbGoiASACQWxqIgIpAgA3AgAgASACKQIINwIIIAEgAigCEDYCECACIAlHDQALIAAoAgAhBQsgACABNgIAIAogBzYCACALIAw2AgAgBUUEQA8LIAUQ4QULoQEBA38gAUEBRgR/QQIFIAFBf2ogAXEEfyABENICBSABCwsiAyAAKAIEIgJLBEAgACADEKQBDwsgAyACTwRADwsgACgCDLMgACoCEJWNqSEBIAJBAksgAkF/aiACcUVxBEBBAUEgIAFBf2pna3QhBCABQQJPBEAgBCEBCwUgARDSAiEBCyADIAFJBH8gAQUgAyIBCyACTwRADwsgACABEKQBC64FAQh/IABBBGohAiABRQRAIAAoAgAhASAAQQA2AgAgAQRAIAEQ4QULIAJBADYCAA8LIAFB/////wNLBEBBCBAFIgNBpYgBEOQFIANB8OQANgIAIANBmBlBkQEQBwsgAUECdBDgBSEFIAAoAgAhAyAAIAU2AgAgAwRAIAMQ4QULIAIgATYCAEEAIQIDQCAAKAIAIAJBAnRqQQA2AgAgAkEBaiICIAFHDQALIABBCGoiAigCACIGRQRADwsgBigCBCEDIAFBf2oiByABcUUiBQRAIAMgB3EhAwUgAyABTwRAIAMgAXAhAwsLIAAoAgAgA0ECdGogAjYCACAGKAIAIgJFBEAPCyAFBEAgAiEBIAYhBQNAAn8gASgCBCAHcSIEIANGBH8gAQUgACgCACAEQQJ0aiICKAIARQRAIAIgBTYCACAEIQMgAQwCCwJAIAEoAgAiAgRAIAEoAgghCSABIQYDQCAJIAIoAghHBEAgBiECDAMLIAIoAgAiCARAIAIhBiAIIQIMAQsLBSABIQILCyAFIAIoAgA2AgAgAiAAKAIAIARBAnRqKAIAKAIANgIAIAAoAgAgBEECdGooAgAgATYCACAFCwsiAigCACIBBEAgAiEFDAELCw8LIAMhBQNAIAIoAgQiBCABTwRAIAQgAXAhBAsCfyAEIAVGBH8gAgUgACgCACAEQQJ0aiIDKAIARQRAIAMgBjYCACAEIQUgAgwCCwJAIAIoAgAiAwRAIAIoAgghCSACIQgDQCAJIAMoAghHBEAgCCEDDAMLIAMoAgAiBwRAIAMhCCAHIQMMAQsLBSACIQMLCyAGIAMoAgA2AgAgAyAAKAIAIARBAnRqKAIAKAIANgIAIAAoAgAgBEECdGooAgAgAjYCACAGCwsiAygCACICBEAgAyEGDAELCwvOAwMFfwJ+An0gACAAQcQAaiIFKAIAIgNBCGoiBCgCADYCVCAAIANBDGoiBigCADYCWCAAIAMoAgA2AgwgACADKAIUNgIsIABBOGoiBysDALYhCyAEKgIAIQogAywABAR9IApDAACAP2AEf0GI5gEoAgAiBCEDQYzmASgCACAEa0EYbUF/agUgCkMAAAAAXwR/QYjmASgCACEDQQAFQYjmASgCACIEIQMgCkGM5gEoAgAgBGtBGG2zlKgLCyEEIAMgBEEYbGorAwAgC7uitgUgCkMAAKBBlAshCiAAQRBqIgMgCjgCACAAIAogACoCBJQ4AiggByABKAIAKwMAOQMAIAAgBigCADYCMCAAQUBrELcCskMAAIAwlEMAAIC/kjgCACACKQMAIgggBSgCACICKQMYIglSBEAgASgCACwAFQRAIAggCX25IAMqAgAgACoCCJS7oiACKgIgu6C2u0QAAABg+yEZQBAstiILQ9sPyUCSIQogACALQwAAAABdBH0gCgUgCyIKCzgCGCAAIAo4AiQPCwsgAioCELtEAAAAYPshGUAQLLYiC0PbD8lAkiEKIAAgC0MAAAAAXQR9IAoFIAsiCgs4AhggACAKOAIkC9ciAgp/BX0gAEGcA2oiByAAQZQDaiIKKAIAIgMoAgg2AgAgAEGgA2oiCCADKAIMNgIAIABBBGoiCSgCACIDLAAUBEAgAEHAAWoQqAEhCyAJKAIAIQIgAEEgaiEFIABBFGohBEEAIQMDQAJAIAJBJGogA0ECdGooAgAiAUGW7r7CAkgEQCABQYjinM99SARAIAFB6b/C73tOBEAgAUGVkc/UfEgEQCABQem/wu97aw0EIAQoAgBB+ABqIgEgASoCACALIAJBHGogA0ECdGoqAgCUQwAAcEKUkjgCAAwEBSABQZWRz9R8aw0EIAQoAgAiAUH4AGoiBiAGKgIAIAsgAkEcaiADQQJ0aioCAJRDAABwQpQiDJI4AgAgAUGIAmoiBiAMIAYqAgCSOAIAIAFBmANqIgEgDCABKgIAkjgCAAwECwALIAFBqJSQhHtIBEAgAUHDi9n4eWsNAyAEKAIAQZgDaiIBIAEqAgAgCyACQRxqIANBAnRqKgIAlEMAAHBClJI4AgAMAwsgAUGolJCEe2sNAiAFKAIAIgFBzAFqIgYqAgAhDCALIAJBHGogA0ECdGoqAgCUIg1DAAAAAF0EQCAGIAwgDSAMQwAAIMGSlJI4AgAgAUGoA2oiASoCACEMIAEgDCANIAxDAAAgwZKUkjgCAAwDBSAGIAwgDUMAEKRGIAyTlJI4AgAgAUGoA2oiASoCACEMIAEgDCANQwAQpEYgDJOUkjgCAAwDCwALIAFBg7yQKkgEQCABQZnt6Yt/TgRAIAFBme3pi39rDQMgBCgCAEGMAmoiASALIAJBHGogA0ECdGoqAgCUIAEqAgCSOAIADAMLIAFBiOKcz31rDQIgBSgCAEGoA2oiASoCACEMIAsgAkEcaiADQQJ0aioCAJQiDUMAAAAAXQRAIAEgDCANIAxDAAAgwZKUkjgCAAUgASAMIA1DABCkRiAMk5SSOAIACwUgAUHg24/bAE4EQCABQeDbj9sAaw0DIAQoAgBBiAJqIgEgASoCACALIAJBHGogA0ECdGoqAgCUQwAAcEKUkjgCAAwDCyABQYO8kCprDQIgBSgCAEGsA2oiASoCACEMIAsgAkEcaiADQQJ0aioCAJQiDUMAAAAAXQRAIAEgDCANIAyUkjgCAAUgASAMIA1DAAAgQSAMk5SSOAIACwsFIAFB44HaugROBEAgAUG+4NLtBk4EQCABQcfrvc8HSARAIAFBvuDS7QZrDQQgBCgCAEGcA2oiASALIAJBHGogA0ECdGoqAgCUIAEqAgCSOAIADAQFIAFBx+u9zwdrDQQgCCAIKgIAIAsgAkEcaiADQQJ0aioCAJSSOAIADAQLAAsgAUG3w4TjBk4EQCABQbfDhOMGaw0DIAQoAgAiAUH8AGoiBiALIAJBHGogA0ECdGoqAgCUIgwgBioCAJI4AgAgAUGMAmoiBiAMIAYqAgCSOAIAIAFBnANqIgEgDCABKgIAkjgCAAwDCyABQeOB2roEaw0CIAUoAgAiAUHQAWoiBioCACEMIAsgAkEcaiADQQJ0aioCAJQiDUMAAAAAXQRAIAYgDCANIAyUkjgCACABQawDaiIBKgIAIQwgASAMIA0gDJSSOAIADAMFIAYgDCANQwAAIEEgDJOUkjgCACABQawDaiIBKgIAIQwgASAMIA1DAAAgQSAMk5SSOAIADAMLAAsgAUGPzIPnAkgEQCABQfyGo9oCSARAIAFBlu6+wgJrDQMgByAHKgIAIAsgAkEcaiADQQJ0aioCAJSSOAIADAMLIAFB/Iaj2gJrDQIgBSgCAEHQAWoiASoCACEMIAsgAkEcaiADQQJ0aioCAJQiDUMAAAAAXQRAIAEgDCANIAyUkjgCAAUgASAMIA1DAAAgQSAMk5SSOAIACwUgAUGQtZqLBE4EQCABQZC1mosEaw0DIAQoAgBB/ABqIgEgCyACQRxqIANBAnRqKgIAlCABKgIAkjgCAAwDCyABQY/Mg+cCaw0CIAUoAgBBzAFqIgEqAgAhDCALIAJBHGogA0ECdGoqAgCUIg1DAAAAAF0EQCABIAwgDSAMQwAAIMGSlJI4AgAFIAEgDCANQwAQpEYgDJOUkjgCAAsLCwsgA0EBaiIDQQJHDQALIAIhAwsgAywAFUUEQA8LIAcqAgAiCyAAQaQDaiIEKgIAXARAIAArA4gDtiEMIAAgCigCACwABAR9IAtDAACAP2AEf0GI5gEoAgAiASECQYzmASgCACABa0EYbUF/agUgC0MAAAAAXwR/QYjmASgCACECQQAFQYjmASgCACIBIQIgC0GM5gEoAgAgAWtBGG2zlKgLCyEBIAIgAUEYbGorAwAgDLuitgUgC0MAAKBBlAsiDDgC4AIgACAMIAAqAtQClDgC+AIgBCALOAIACyAAQYADaiEBIAgqAgAiCyAAQagDaiICKgIAXARAIAEgCzgCACACIAs4AgALAkAgAEHsAmoiAioCACILQwAAAABcBEAgAiALIABB8AJqIgQqAgAiC5MiDDgCACALIAyUQwAAAABdBEAgBCALIAySIgs4AgAgAkMAAAAAOAIACyALIABB9AJqIgIqAgCSIQsgAiALOAIAIAtDAAAAAF0EQCACIAtD2w/JQJIiCzgCAAwCCyALQ9sPyUBeBEAgAiALQ9sPycCSIgs4AgALBSAAQfQCaiIEIQIgBCoCACELCwsgC0PbD8lAXgRAIAIgC0PbD8nAkiILOAIACwJAAkACQAJAAkACQAJAIAAoAtwCDgUAAwIBBAULIAtDg/kiQpQiDKgiBEECdEHIH2oqAgAiDSAEQQJ0QcwfaioCACANkyAMIASyk5SSIQwMBQsgAEH4AmohBAJ9IAtD2w9JQF0EfSALQ4P5Ij+UQwAAgL+SIQwgBCoCACINQwAAgECUQ4P5Ij6UIQ4gDSALXgRAIA5DAACAPyALIA2VkyINIA0gDZSUQwAAQECVlAwCC0PbD0lAIA2TIAtdBH0gDiALQ9sPScCSIA2VQwAAgD+SIg0gDSANlJSMQwAAQECVlAVDAAAAAAsFQwAAgD8gC0PbD0nAkiINQ4P5Ij+UkyEMIAQqAgAiDkMAAIBAlEOD+SI+lCEPIA0gDl0EQCAPQwAAgD8gDSAOlZMiDSANIA2UlIxDAABAQJWUDAILIA1D2w9JQCAOk14EfSAPIA1D2w9JwJIgDpVDAACAP5IiDSANIA2UlEMAAEBAlZQFQwAAAAALCwsiDSAMkiEMDAQLIAAqAvgCIQwCfSAAKgLkAkPbD8lAlCIOIAteBH0gCyAMXQRAQwAAgD8hDUMAAIA/IAsgDJWTIgwgDJSMDAILIA4gDJMgC10EfUMAAIA/IQ0gCyAOkyAMlUMAAIA/kiIMIAyUjAVDAACAPyENQwAAAAALBSAMIA6SIAteBEBDAACAvyENQwAAgD8gCyAOkyAMlZMiDCAMlAwCCyALQ9sPycCSIAyVQwAAgD+SIQ5D2w/JQCAMkyALXQR9QwAAgL8hDSAOIA6UBUMAAIC/IQ1DAAAAAAsLCyIMIA2SIQwMAwtDAACAPyALQ4P5oj6UkyIOIAsgACoC+AIiDF0EfUMAAIA/IAsgDJWTIgwgDJSMBSALQ9sPycCSIAyVQwAAgD+SIQ1D2w/JQCAMkyALXQR9IA0gDZQFQwAAAAALCyIMkiEMDAILIAsgACoC+AJdBEAgABC3ArJDAACAMJRDAACAv5IiDDgCkAMgAioCACELIAkoAgAhAwwCBSAAKgKQAyEMDAILAAtDAAAAACEMCyACIAAqAvgCIAuSOAIAIAwgACoC/AKSIAEqAgCUIQwgAEEgaiEEIABBFGohAUEAIQIDQAJAAn0gA0E0aiACQQJ0aigCACIAQYO8kCpIBH0gAEHpv8Lve0gEQCAAQaiUkIR7SARAIABBw4vZ+HlIBEAgAEH1yvbueGsNBSAMIANBLGogAkECdGoqAgCUIAEoAgBBkAJqIgAqAgCSDAQFIABBw4vZ+HlrDQUgASgCAEGYA2oiACoCACAMIANBLGogAkECdGoqAgCUQwAAcEKUkgwECwALIABBrIHD2ntOBEAgAEGsgcPae2sNBCAMIANBLGogAkECdGoqAgCUIAEoAgBBgAFqIgAqAgCSDAMLIABBqJSQhHtrDQMgBCgCACIAQcwBaiIFKgIAIQsgDCADQSxqIAJBAnRqKgIAlCINQwAAAABdBEAgBSALIA0gC0MAACDBkpSSOAIAIABBqANqIgAqAgAiCyANIAtDAAAgwZKUkgwDBSAFIAsgDUMAEKRGIAuTlJI4AgAgAEGoA2oiACoCACILIA1DABCkRiALk5SSDAMLAAsgAEGI4pzPfUgEQCAAQZWRz9R8SARAIABB6b/C73trDQQgASgCAEH4AGoiACoCACAMIANBLGogAkECdGoqAgCUQwAAcEKUkgwDBSAAQZWRz9R8aw0EIAEoAgAiAEH4AGoiBSAFKgIAIAwgA0EsaiACQQJ0aioCAJRDAABwQpQiC5I4AgAgAEGIAmoiBSALIAUqAgCSOAIAIAsgAEGYA2oiACoCAJIMAwsACyAAQbrY3tB+SARAIABBiOKcz31rDQMgBCgCAEGoA2oiACoCACELIAwgA0EsaiACQQJ0aioCAJQiDUMAAAAAXQRAIAsgDSALQwAAIMGSlJIMAwUgCyANQwAQpEYgC5OUkgwDCwALIABBme3pi39IBH0gAEG62N7QfmsNAyAMIANBLGogAkECdGoqAgCUIAEoAgBBoANqIgAqAgCSBSAAQZnt6Yt/aw0DIAwgA0EsaiACQQJ0aioCAJQgASgCAEGMAmoiACoCAJILBSAAQZC1mosETgRAIABBt8OE4wZIBEAgAEHjgdq6BEgEQCAAQZC1mosEaw0FIAwgA0EsaiACQQJ0aioCAJQgASgCAEH8AGoiACoCAJIMBAsgAEHjgdq6BGsNBCAEKAIAIgBB0AFqIgUqAgAhCyAMIANBLGogAkECdGoqAgCUIg1DAAAAAF0EQCAFIAsgDSALlJI4AgAgAEGsA2oiACoCACILIA0gC5SSDAQFIAUgCyANQwAAIEEgC5OUkjgCACAAQawDaiIAKgIAIgsgDUMAACBBIAuTlJIMBAsACyAAQb7g0u0GSARAIABBt8OE4wZrDQQgASgCACIAQfwAaiIFIAwgA0EsaiACQQJ0aioCAJQiCyAFKgIAkjgCACAAQYwCaiIFIAsgBSoCAJI4AgAgCyAAQZwDaiIAKgIAkgwDCyAAQfXE/vQGSARAIABBvuDS7QZrDQQgDCADQSxqIAJBAnRqKgIAlCABKAIAQZwDaiIAKgIAkgwDBSAAQfXE/vQGaw0EIAEoAgAiAEGAAWoiBSAMIANBLGogAkECdGoqAgCUIgsgBSoCAJI4AgAgAEGQAmoiBSALIAUqAgCSOAIAIAsgAEGgA2oiACoCAJIMAwsACyAAQfyGo9oCSARAIABB4NuP2wBOBEAgAEHg24/bAGsNBCABKAIAQYgCaiIAKgIAIAwgA0EsaiACQQJ0aioCAJRDAABwQpSSDAMLIABBg7yQKmsNAyAEKAIAQawDaiIAKgIAIQsgDCADQSxqIAJBAnRqKgIAlCINQwAAAABdBEAgCyANIAuUkgwDBSALIA1DAAAgQSALk5SSDAMLAAsgAEGPzIPnAkgEfSAAQfyGo9oCaw0DIAQoAgBB0AFqIgAqAgAhCyAMIANBLGogAkECdGoqAgCUIg1DAAAAAF0EfSALIA0gC5SSBSALIA1DAAAgQSALk5SSCwUgAEGPzIPnAmsNAyAEKAIAQcwBaiIAKgIAIQsgDCADQSxqIAJBAnRqKgIAlCINQwAAAABdBH0gCyANIAtDAAAgwZKUkgUgCyANQwAQpEYgC5OUkgsLCwshCyAAIAs4AgALIAJBAWoiAkECRw0ACwu9AwEIfyAAQQhqIgooAgAiBCAAQQRqIgYoAgAiA2tBFG0gAU8EQCADIQADQCAAIAIpAgA3AgAgACACKQIINwIIIAAgAigCEDYCECAGIAYoAgBBFGoiADYCACABQX9qIgENAAsPCyADIAAoAgAiA2tBFG0iCCABaiIJQcyZs+YASwRAEKwECyAEIANrQRRtIgNB5syZM0khBCADQQF0IgMgCUkEQCAJIQMLIAQEfyADBUHMmbPmAAsiBQRAIAVBzJmz5gBLBEBBCBAFIgNBpYgBEOQFIANB8OQANgIAIANBmBlBkQEQBwUgBUEUbBDgBSEHCwVBACEHCyAHIAhBFGxqIgMhBANAIAQgAikCADcCACAEIAIpAgg3AgggBCACKAIQNgIQIARBFGohBCABQX9qIgENAAsgByAFQRRsaiEIIAcgCUEUbGohBSAGKAIAIgIgACgCACIERgRAIAMhAQUgAyEBA0AgAUFsaiIBIAJBbGoiAikCADcCACABIAIpAgg3AgggASACKAIQNgIQIAIgBEcNAAsgACgCACEECyAAIAE2AgAgBiAFNgIAIAogCDYCACAERQRADwsgBBDhBQvVAwMBfwJ9AnwCQAJAAkACQAJAAkACQCAAKAIAQQFrDgUBAgMEAAULIABBCGoiASsDACAAKwOIAaEhBCABIAQ5AwAgBEQAAAAAAAAAAGUEQCABRAAAAAAAAAAAOQMAIABBADYCAEQAAAAAAAAAACEECwwFCyAAKwMwIABBCGoiASsDACAAKwMgoqAhBCABIAQ5AwAgBEQAAAAAAADwP2YEQCABRAAAAAAAAPA/OQMAIABBAjYCAEQAAAAAAADwPyEECwwECyAAKwNYIABBCGoiASsDACAAKwNIoqAhBCABIAQ5AwAgBCAAKwOAASIFZQRAIAEgBTkDACAAQQM2AgAgBSEECwwDCyAAQQhqIgErAwAiBCAAKwOAASIFYgRAIAQgBWMEQCABIAW2IgIgBEQtQxzr4jYqP6C2IgNdBH0gAgUgAwu7IgQ5AwAMBAUgASAERC1DHOviNiq/oLYiAiAFtiIDXQR9IAMFIAILuyIEOQMADAQLAAsMAgsgACsDeCAAQQhqIgErAwAgACsDaKKgIQQgASAEOQMAIAREAAAAAAAAAABlBEAgAUQAAAAAAAAAADkDACAAQQA2AgBEAAAAAAAAAAAhBAsMAQsgACsDCCEECyAEtgv8BwICfwV9AkAgAEEcaiICKgIAIgNDAAAAAFwEQCACIAMgAEEgaiIBKgIAIgOTIgQ4AgAgAyAElEMAAAAAXQRAIAEgAyAEkiIDOAIAIAJDAAAAADgCAAsgAyAAQSRqIgEqAgCSIQMgASADOAIAIANDAAAAAF0EQCABIAND2w/JQJIiAzgCAAwCCyADQ9sPyUBeBEAgASADQ9sPycCSIgM4AgALBSAAQSRqIgIhASACKgIAIQMLCyADQ9sPyUBeBEAgASADQ9sPycCSIgQ4AgAFIAMhBAsCQAJAAkACQAJAAkAgACgCDA4FAAMCAQQFCyAEQ4P5IkKUIgWoIgJBAnRByB9qKgIAIgMgAkECdEHMH2oqAgAgA5MgBSACspOUkiEDIAEgACoCKCAEkjgCACADDwsgAEEoaiECAn0gBEPbD0lAXQR9IARDg/kiP5RDAACAv5IhAyACKgIAIgZDAACAQJRDg/kiPpQhBSAGIAReBEAgBUMAAIA/IAQgBpWTIgUgBSAFlJRDAABAQJWUDAILQ9sPSUAgBpMgBF0EfSAFIARD2w9JwJIgBpVDAACAP5IiBSAFIAWUlIxDAABAQJWUBUMAAAAACwVDAACAPyAEQ9sPScCSIgdDg/kiP5STIQMgAioCACIGQwAAgECUQ4P5Ij6UIQUgByAGXQRAIAVDAACAPyAHIAaVkyIFIAUgBZSUjEMAAEBAlZQMAgsgB0PbD0lAIAaTXgR9IAUgB0PbD0nAkiAGlUMAAIA/kiIFIAUgBZSUQwAAQECVlAVDAAAAAAsLCyEFIAEgACoCKCAEkjgCACAFIAOSDwsgACoCKCEGAn0gACoCFEPbD8lAlCIDIAReBH0gBCAGXQRAQwAAgD8hBUMAAIA/IAQgBpWTIgMgA5SMDAILIAMgBpMgBF0EfUMAAIA/IQUgBCADkyAGlUMAAIA/kiIDIAOUjAVDAACAPyEFQwAAAAALBSAGIAOSIAReBEBDAACAvyEFQwAAgD8gBCADkyAGlZMiAyADlAwCCyAEQ9sPycCSIAaVQwAAgD+SIQND2w/JQCAGkyAEXQR9QwAAgL8hBSADIAOUBUMAAIC/IQVDAAAAAAsLCyEDIAEgACoCKCAEkjgCACADIAWSDwtDAACAPyAEQ4P5oj6UkyEFIAQgACoCKCIGXQR9QwAAgD8gBCAGlZMiAyADlIwFIARD2w/JwJIgBpVDAACAP5IhA0PbD8lAIAaTIARdBH0gAyADlAVDAAAAAAsLIQMgASAAKgIoIASSOAIAIAUgA5IPCxC3ArJDAACAMJRDAACAv5IhAyABIAAqAiggASoCAJI4AgAgAw8LIAEgACoCKCAEkjgCAEMAAAAAC5cEAwF/AX0CfCAAQRBqIgIgAbs5AwAgAEQAAAAAAAAAADkDCCAAQzSAtzkQnAEgAEM0gLc5EJ0BIABEAAAAAAAA8D85A4ABIABBQGsgACsDOCACKwMAokQAAAAAAAAAAKIiBDkDACAAAnwgBEQAAAAAAAAAAGEEfCAARAAAAAAAAAAAOQNIRAAAAAAAAPA/BSAAKwNQIgVEAAAAAAAAAABhBEAgAEQAAAAAAADwPzkDSEQAAAAAAAAAACAEowwCCyAEtiEBRAAAAAAAAPA/IAW2IgO7oyEEIAAgA0MAAAAAXQR8RAAAAAAAAPA/IAShENECBSAERAAAAAAAAPA/oBDRApoLIgQgAbujEM8CIgQ5A0hEAAAAAAAA8D8gBUQAAAAAAAAAAKKhRAAAAAAAAPA/IAShogsLIgQ5A1ggAEM0gLc5EJ4BIABEAAAAAAAAAAA5AyggAEEgaiECIAAgACsDGCIERAAAAAAAAAAAYQR8IAJEAAAAAAAAAAA5AwBEAAAAAAAA8D8FIAJEAAAAAAAA8D85AwBEAAAAAAAA8D8gBKMLIgQ5AzAgAEMAAAAAEJ8BIABEAAAAAAAAAAA5A3AgAEHoAGohAiAAKwNgIgREAAAAAAAAAABhBEAgAkQAAAAAAAAAADkDACAARAAAAAAAAAAAOQN4BSACRAAAAAAAAPA/OQMAIABEAAAAAAAA8L8gBKM5A3gLC4sCAQN/IAAoAmwiAQRAIAFBBGoiAygCACECIAMgAkF/ajYCACACRQRAIAEgASgCACgCCEH/AXFB2wJqEQAAIAEQ2wULCyAAKAJkIgEEQCABQQRqIgMoAgAhAiADIAJBf2o2AgAgAkUEQCABIAEoAgAoAghB/wFxQdsCahEAACABENsFCwsgACgCXCIBBEAgAUEEaiIDKAIAIQIgAyACQX9qNgIAIAJFBEAgASABKAIAKAIIQf8BcUHbAmoRAAAgARDbBQsLIAAoAkwiAQRAIAAgATYCUCABEOEFCyAAQUBrKAIAIgEEQCAAIAE2AkQgARDhBQsgACgCDCIBRQRADwsgACABNgIQIAEQ4QULsgEBA38gAEGYKTYCACAAKAKMASIBBEAgAUEEaiIDKAIAIQIgAyACQX9qNgIAIAJFBEAgASABKAIAKAIIQf8BcUHbAmoRAAAgARDbBQsLIABB/Co2AgAgACgCYCIBBEAgACABNgJkIAEQ4QULIAAoAlAiAQRAIAAgATYCVCABEOEFCyAAQUBrKAIAIgEEQCAAIAE2AkQgARDhBQsgACgCMCIBRQRADwsgACABNgI0IAEQ4QULvAEBA38gAEGYKTYCACAAKAKMASIBBEAgAUEEaiIDKAIAIQIgAyACQX9qNgIAIAJFBEAgASABKAIAKAIIQf8BcUHbAmoRAAAgARDbBQsLIABB/Co2AgAgACgCYCIBBEAgACABNgJkIAEQ4QULIAAoAlAiAQRAIAAgATYCVCABEOEFCyAAQUBrKAIAIgEEQCAAIAE2AkQgARDhBQsgACgCMCIBRQRAIAAQ4QUPCyAAIAE2AjQgARDhBSAAEOEFCxIAIABB4Cg2AgAgAEEQahCxAQsXACAAQeAoNgIAIABBEGoQsQEgABDhBQsKACAAQRBqELEBC/sCAQd/IAAoApgDIgEEQCABQQRqIgMoAgAhAiADIAJBf2o2AgAgAkUEQCABIAEoAgAoAghB/wFxQdsCahEAACABENsFCwsgAEEgaiIDKAIAIgIEQCAAQSRqIgQoAgAiASACRgR/IAIFA0AgAUGkfmoiASABKAIAKAIAQf8BcUHbAmoRAAAgASACRw0ACyADKAIACyEBIAQgAjYCACABEOEFCyAAQRRqIgUoAgAiAwRAIABBGGoiBigCACIBIANGBH8gAwUDQCABQfB+aiECIAFBZGooAgAiAQRAIAFBBGoiBygCACEEIAcgBEF/ajYCACAERQRAIAEgASgCACgCCEH/AXFB2wJqEQAAIAEQ2wULCyACEKsBIAIgA0cEQCACIQEMAQsLIAUoAgALIQEgBiADNgIAIAEQ4QULIAAoAggiAEUEQA8LIABBBGoiAigCACEBIAIgAUF/ajYCACABBEAPCyAAIAAoAgAoAghB/wFxQdsCahEAACAAENsFC6QDAQZ/IwchBSMHQRBqJAcgBSEGIAEgAEYEQCAFJAcPCyAAQRBqIgQoAgAiAiEHIAFBEGohAyACIABGBEAgAygCACABRgRAIAIgBiACKAIAKAIMQT9xQd0EahEFACAEKAIAIgIgAigCACgCEEH/AXFB2wJqEQAAIARBADYCACADKAIAIgIgACACKAIAKAIMQT9xQd0EahEFACADKAIAIgIgAigCACgCEEH/AXFB2wJqEQAAIANBADYCACAEIAA2AgAgBiABIAYoAgAoAgxBP3FB3QRqEQUAIAYgBigCACgCEEH/AXFB2wJqEQAAIAMgATYCACAFJAcFIAIgASACKAIAKAIMQT9xQd0EahEFACAEKAIAIgAgACgCACgCEEH/AXFB2wJqEQAAIAQgAygCADYCACADIAE2AgAgBSQHCwUgASADKAIAIgFGBEAgASAAIAEoAgAoAgxBP3FB3QRqEQUAIAMoAgAiASABKAIAKAIQQf8BcUHbAmoRAAAgAyAEKAIANgIAIAQgADYCACAFJAcFIAQgATYCACADIAc2AgAgBSQHCwsLHQEBf0EIEOAFIgFBoCo2AgAgASAAKAIENgIEIAELFAAgAUGgKjYCACABIAAoAgQ2AgQLJgEBfyAAKAIEIgBBkAFqIgIgAioCACAAKgKIAZMgASoCAJI4AgALHQEBfyAAQQRqIQIgASgCBEGEjgFGBH8gAgVBAAsLBQBB8AsLHQEBf0EIEOAFIgFB9Ck2AgAgASAAKAIENgIEIAELFAAgAUH0KTYCACABIAAoAgQ2AgQLJwEBfyAAKAIEIgBBkAFqIgIgAioCACAAKAJospMgASgCALKSOAIACx0BAX8gAEEEaiECIAEoAgRBlo8BRgR/IAIFQQALCwUAQZAMCx0BAX9BCBDgBSIBQcgpNgIAIAEgACgCBDYCBCABCxQAIAFByCk2AgAgASAAKAIENgIECyUBAX8gACgCBCICIAIqAogBIAEoAgBBDGwgAigCaGqykjgCkAELHQEBfyAAQQRqIQIgASgCBEGqkAFGBH8gAgVBAAsLBQBBsAwL0QEBAX8gAEHUJzYCACAAQYABaiAAKAKQASIBRgRAIAEgASgCACgCEEH/AXFB2wJqEQAABSABBEAgASABKAIAKAIUQf8BcUHbAmoRAAALCyAAQeAAaiAAKAJwIgFGBEAgASABKAIAKAIQQf8BcUHbAmoRAAAFIAEEQCABIAEoAgAoAhRB/wFxQdsCahEAAAsLIABBQGsgACgCUCIARgRAIAAgACgCACgCEEH/AXFB2wJqEQAADwsgAEUEQA8LIAAgACgCACgCFEH/AXFB2wJqEQAAC+ABAQF/IABB1Cc2AgAgAEGAAWogACgCkAEiAUYEQCABIAEoAgAoAhBB/wFxQdsCahEAAAUgAQRAIAEgASgCACgCFEH/AXFB2wJqEQAACwsgAEHgAGogACgCcCIBRgRAIAEgASgCACgCEEH/AXFB2wJqEQAABSABBEAgASABKAIAKAIUQf8BcUHbAmoRAAALCyAAQUBrIAAoAlAiAUYEQCABIAEoAgAoAhBB/wFxQdsCahEAACAAEOEFDwsgAUUEQCAAEOEFDwsgASABKAIAKAIUQf8BcUHbAmoRAAAgABDhBQvJAQEBfyAAQYABaiAAKAKQASIBRgRAIAEgASgCACgCEEH/AXFB2wJqEQAABSABBEAgASABKAIAKAIUQf8BcUHbAmoRAAALCyAAQeAAaiAAKAJwIgFGBEAgASABKAIAKAIQQf8BcUHbAmoRAAAFIAEEQCABIAEoAgAoAhRB/wFxQdsCahEAAAsLIABBQGsgACgCUCIARgRAIAAgACgCACgCEEH/AXFB2wJqEQAADwsgAEUEQA8LIAAgACgCACgCFEH/AXFB2wJqEQAAC7W6AQFbfyMHIQkjB0GwFGokByAJQZwUaiEeIAlByABqIR8gCUGIFGohGiAJQfQTaiEiIAlB4BNqISMgCUHME2ohJCAJQbgTaiElIAlBMGohICAJQaQTaiEbIAlBkBNqISYgCUH8EmohJyAJQegSaiEoIAlB1BJqISkgCUEYaiEhIAlBwBJqIRwgCUGsEmohKiAJQZgSaiErIAlBhBJqISwgCUHwEWohLSAJQdwRaiEuIAlByBFqIS8gCUG0EWohMCAJQaARaiExIAlBjBFqITIgCUH4EGohMyAJQeQQaiE0IAlB0BBqITUgCUG8EGohNiAJQagQaiE3IAlBlBBqITggCUGAEGohOSAJQewPaiE6IAlB2A9qITsgCUHED2ohPCAJQbAPaiE9IAlBnA9qIT4gCUGID2ohHSAJQfQOaiEDIAkhGCAJQeAOaiEZIAlB4ABqIgFEERERERERcT85AwAgAUEIaiIAQgA3AwAgAEEANgIIIABBC2oiCEEDOgAAIABB5pEBLgAAOwAAIABB6JEBLAAAOgACIABBADoAAyABQRhqIgREFmzBFmzBdj85AwAgAUEgaiIQQgA3AwAgEEEANgIIIBBBC2oiBkEEOgAAIBBBsd7IoQQ2AgAgAUEAOgAkIAFBMGoiCkSamZmZmZl5PzkDACABQThqIhFCADcDACARQQA2AgggEUELaiI/QQQ6AAAgEUGx3sShBTYCACABQQA6ADwgAUHIAGoiQEQRERERERGBPzkDACABQdAAaiICQgA3AwAgAkEANgIIIAJBC2oiQUEDOgAAIAJB6pEBLgAAOwAAIAJB7JEBLAAAOgACIAJBADoAAyABQeAAaiJCRBZswRZswYY/OQMAIAFB6ABqIhJCADcDACASQQA2AgggEkELaiJDQQQ6AAAgEkGx3tChBDYCACABQQA6AGwgAUH4AGoiRESamZmZmZmJPzkDACABQYABaiITQgA3AwAgE0EANgIIIBNBC2oiRUEEOgAAIBNBsd7IoQU2AgAgAUEAOgCEASABQZABaiJGRBEREREREZE/OQMAIAFBmAFqIgVCADcDACAFQQA2AgggBUELaiJHQQM6AAAgBUHukQEuAAA7AAAgBUHwkQEsAAA6AAIgBUEAOgADIAFBqAFqIkhEFmzBFmzBlj85AwAgAUGwAWoiFEIANwMAIBRBADYCCCAUQQtqIklBBDoAACAUQbHe4KEENgIAIAFBADoAtAEgAUHAAWoiSkSamZmZmZmZPzkDACABQcgBaiIVQgA3AwAgFUEANgIIIBVBC2oiS0EEOgAAIBVBsd7QoQU2AgAgAUEAOgDMASABQdgBaiJMRBEREREREaE/OQMAIAFB4AFqIgxCADcDACAMQQA2AgggDEELaiJNQQM6AAAgDEHykQEuAAA7AAAgDEH0kQEsAAA6AAIgDEEAOgADIAFB8AFqIk5EFmzBFmzBpj85AwAgAUH4AWoiC0IANwMAIAtBADYCCCALQQtqIk9BBToAACALQfaRASgAADYAACALQfqRASwAADoABCALQQA6AAUgAUGIAmoiUESamZmZmZmpPzkDACABQZACaiIWQgA3AwAgFkEANgIIIBZBC2oiUUEEOgAAIBZBsd7goQU2AgAgAUEAOgCUAiABQaACaiJSRBEREREREbE/OQMAIAFBqAJqIhdCADcDACAXQQA2AgggF0ELaiJTQQQ6AAAgF0Gx3sSxAzYCACABQQA6AKwCIAFBuAJqIlREFmzBFmzBtj85AwAgAUHAAmoiDkIANwMAIA5BADYCCCAOQQtqIlVBBToAACAOQfyRASgAADYAACAOQYCSASwAADoABCAOQQA6AAUgAUHQAmoiVkSamZmZmZm5PzkDACABQdgCaiIPQgA3AwAgD0EANgIIIA9BC2oiV0EFOgAAIA9BgpIBKAAANgAAIA9BhpIBLAAAOgAEIA9BADoABSABQegCaiJYRBEREREREcE/OQMAIAFB8AJqIg1CADcDACANQQA2AgggDUELaiJZQQQ6AAAgDUGx3syRAzYCACABQQA6APQCQYjmAUEANgIAQYzmAUEANgIAQZDmAUEANgIAQYzmAUGAAxDgBSIHNgIAQYjmASAHNgIAQZDmASAHQYADajYCACAHRBEREREREXE/OQMAIAdBCGogABDnBUGM5gFBjOYBKAIAIgdBGGoiWjYCACBaIAQrAwA5AwAgB0EgaiAQEOcFQYzmAUGM5gEoAgAiB0EYaiIENgIAIAQgCisDADkDACAHQSBqIBEQ5wVBjOYBQYzmASgCACIHQRhqIgQ2AgAgBCBAKwMAOQMAIAdBIGogAhDnBUGM5gFBjOYBKAIAIgdBGGoiBDYCACAEIEIrAwA5AwAgB0EgaiASEOcFQYzmAUGM5gEoAgAiB0EYaiIENgIAIAQgRCsDADkDACAHQSBqIBMQ5wVBjOYBQYzmASgCACIHQRhqIgQ2AgAgBCBGKwMAOQMAIAdBIGogBRDnBUGM5gFBjOYBKAIAIgdBGGoiBDYCACAEIEgrAwA5AwAgB0EgaiAUEOcFQYzmAUGM5gEoAgAiB0EYaiIENgIAIAQgSisDADkDACAHQSBqIBUQ5wVBjOYBQYzmASgCACIHQRhqIgQ2AgAgBCBMKwMAOQMAIAdBIGogDBDnBUGM5gFBjOYBKAIAIgdBGGoiBDYCACAEIE4rAwA5AwAgB0EgaiALEOcFQYzmAUGM5gEoAgAiB0EYaiIENgIAIAQgUCsDADkDACAHQSBqIBYQ5wVBjOYBQYzmASgCACIHQRhqIgQ2AgAgBCBSKwMAOQMAIAdBIGogFxDnBUGM5gFBjOYBKAIAIgdBGGoiBDYCACAEIFQrAwA5AwAgB0EgaiAOEOcFQYzmAUGM5gEoAgAiB0EYaiIENgIAIAQgVisDADkDACAHQSBqIA8Q5wVBjOYBQYzmASgCACIHQRhqIgQ2AgAgBCBYKwMAOQMAIAdBIGogDRDnBUGM5gFBjOYBKAIAQRhqNgIAIFksAABBAEgEQCANKAIAEOEFCyBXLAAAQQBIBEAgDygCABDhBQsgVSwAAEEASARAIA4oAgAQ4QULIFMsAABBAEgEQCAXKAIAEOEFCyBRLAAAQQBIBEAgFigCABDhBQsgTywAAEEASARAIAsoAgAQ4QULIE0sAABBAEgEQCAMKAIAEOEFCyBLLAAAQQBIBEAgFSgCABDhBQsgSSwAAEEASARAIBQoAgAQ4QULIEcsAABBAEgEQCAFKAIAEOEFCyBFLAAAQQBIBEAgEygCABDhBQsgQywAAEEASARAIBIoAgAQ4QULIEEsAABBAEgEQCACKAIAEOEFCyA/LAAAQQBIBEAgESgCABDhBQsgBiwAAEEASARAIBAoAgAQ4QULIAgsAABBAEgEQCAAKAIAEOEFCyABQaqEARCgASIENgIAIAFBBGoiDEIANwIAIAxBADYCCCAMQQtqIgZBAToAACAMQS06AAAgDEEAOgABIAFBEGoiCkGIkgEQoAE2AgAgAUEUaiILQgA3AgAgC0EANgIIIAtBEBDgBSIANgIAIAFBkICAgHg2AhwgAUEONgIYIABBiJIBKQAANwAAIABBkJIBKAAANgAIIABBlJIBLgAAOwAMIABBADoADiABQSBqIj9Bl5IBEKABNgIAIAFBJGoiDkIANwIAIA5BADYCCCAOQRAQ4AUiADYCACABQZCAgIB4NgIsIAFBDjYCKCAAQZeSASkAADcAACAAQZ+SASgAADYACCAAQaOSAS4AADsADCAAQQA6AA4gAUEwaiJAQaaSARCgATYCACABQTRqIg9CADcCACAPQQA2AgggD0EgEOAFIgA2AgAgAUGggICAeDYCPCABQRI2AjggAEGmkgEpAAA3AAAgAEGukgEpAAA3AAggAEG2kgEuAAA7ABAgAEEAOgASIAFBQGsiQUG5kgEQoAE2AgAgAUHEAGoiEEIANwIAIBBBADYCCCAQQSAQ4AUiADYCACABQaCAgIB4NgJMIAFBETYCSCAAQbmSASkAADcAACAAQcGSASkAADcACCAAQcmSASwAADoAECAAQQA6ABEgAUHQAGoiQkHLkgEQoAE2AgAgAUHUAGoiEUIANwIAIBFBADYCCCARQSAQ4AUiADYCACABQaCAgIB4NgJcIAFBETYCWCAAQcuSASkAADcAACAAQdOSASkAADcACCAAQduSASwAADoAECAAQQA6ABEgAUHgAGoiQ0HdkgEQoAE2AgAgAUHkAGoiEkIANwIAIBJBADYCCCASQSAQ4AUiADYCACABQaCAgIB4NgJsIAFBFTYCaCAAQd2SASkAADcAACAAQeWSASkAADcACCAAQe2SASgAADYAECAAQfGSASwAADoAFCAAQQA6ABUgAUHwAGoiREHzkgEQoAE2AgAgAUH0AGoiE0ELaiJFQQo6AAAgE0HzkgEpAAA3AAAgE0H7kgEuAAA7AAggE0EAOgAKIAFBgAFqIkZB/pIBEKABNgIAIAFBhAFqIhRBC2oiR0EKOgAAIBRB/pIBKQAANwAAIBRBhpMBLgAAOwAIIBRBADoACiABQZABaiJIQYmTARCgATYCACABQZQBaiIVQQtqIklBCjoAACAVQYmTASkAADcAACAVQZGTAS4AADsACCAVQQA6AAogAUGgAWoiSkGUkwEQoAE2AgAgAUGkAWoiFkIANwIAIBZBADYCCCAWQRAQ4AUiADYCACABQZCAgIB4NgKsASABQQ82AqgBIABBlJMBKQAANwAAIABBnJMBKAAANgAIIABBoJMBLgAAOwAMIABBopMBLAAAOgAOIABBADoADyABQbABaiJLQaSTARCgATYCACABQbQBaiIAQgA3AgAgAEEANgIIIABBC2oiTEEJOgAAIABBpJMBKQAANwAAIABBrJMBLAAAOgAIIABBADoACSABQcABaiJNQa6TARCgATYCACABQcQBaiICQgA3AgAgAkEANgIIIAJBC2oiTkEJOgAAIAJBrpMBKQAANwAAIAJBtpMBLAAAOgAIIAJBADoACSABQdABaiJPQbiTARCgATYCACABQdQBaiIFQgA3AgAgBUEANgIIIAVBC2oiUEEJOgAAIAVBuJMBKQAANwAAIAVBwJMBLAAAOgAIIAVBADoACSABQeABaiJRQcKTARCgATYCACABQeQBaiIXQgA3AgAgF0EANgIIIBdBEBDgBSINNgIAIAFBkICAgHg2AuwBIAFBDTYC6AEgDUHCkwEpAAA3AAAgDUHKkwEoAAA2AAggDUHOkwEsAAA6AAwgDUEAOgANIAFB8AFqIlJB0JMBEKABNgIAIAFB9AFqIg1CADcCACANQQA2AgggDUELaiJTQQg6AAAgDULMjL2CoqqYuuUANwIAIAFBADoA/AEg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yYvGjduy7AA3AgAgAUEAOgAcQdDmAUEANgIAQdTmAUEANgIAQdjmAUEANgIAQdTmAUEgEOAFIgU2AgBB0OYBIAU2AgBB2OYBIAVBIGo2AgAgBUEANgIAIAVBBGogABDnBUHU5gFB1OYBKAIAIgBBEGoiBTYCACAFQQE2AgAgAEEUaiACEOcFQdTmAUHU5gEoAgBBEGo2AgAgAUF/OgAAIAFBBGoiAEIANwIAIABBADYCCCAAQQE6AAsgAEEtOgAAIABBADoAASABQX46ABAgAUEUaiIAQgA3AgAgAEEANgIIIABBCDoACyAAQtbKsfu2rJq6+QA3AgAgAUEAOgAcIAFBAToAICABQSRqIgBCADcCACAAQQA2AgggAEEgEOAFIgA2AgAgAUGggICAeDYCLCABQRw2AiggAEGtlAEpAAA3AAAgAEG1lAEpAAA3AAggAEG9lAEpAAA3ABAgAEHFlAEoAAA2ABggAEEAOgAcIAFBAjoAMCABQTRqIgBCADcCACAAQQA2AgggAEEJOgALIABBypQBKQAANwAAIABB0pQBLAAAOgAIIABBADoACSABQUBrQQM6AAAgAUHEAGoiAEIANwIAIABBADYCCCAAQQk6AAsgAEHUlAEpAAA3AAAgAEHclAEsAAA6AAggAEEAOgAJIAFBBDoAUCABQdQAaiIAQgA3AgAgAEEANgIIIABBCToACyAAQd6UASkAADcAACAAQeaUASwAADoACCAAQQA6AAkgAUEFOgBgIAFB5ABqIgBCADcCACAAQQA2AgggAEEJOgALIABB6JQBKQAANwAAIABB8JQBLAAAOgAIIABBADoACSABQQc6AHAgAUH0AGoiAEIANwIAIABBADYCCCAAQSAQ4AUiADYCACABQaCAgIB4NgJ8IAFBGjYCeCAAQfKUASkAADcAACAAQfqUASkAADcACCAAQYKVASkAADcAECAAQYqVAS4AADsAGCAAQQA6ABogAUEIOgCAASABQYQBaiIAQgA3AgAgAEEANgIIIABBCToACyAAQY2VASkAADcAACAAQZWVASwAADoACCAAQQA6AAkgAUEJOgCQASABQZQBaiIAQgA3AgAgAEEANgIIIABBCToACyAAQZeVASkAADcAACAAQZ+VASwAADoACCAAQQA6AAkgAUEKOgCgASABQaQBaiIAQgA3AgAgAEEANgIIIABBIBDgBSIANgIAIAFBoICAgHg2AqwBIAFBEDYCqAEgAEGhlQEpAAA3AAAgAEGplQEpAAA3AAggAEEAOgAQIAFBCzoAsAEgAUG0AWoiAEIANwIAIABBADYCCCAAQTAQ4AUiADYCACABQbCAgIB4NgK8ASABQSI2ArgBIABBspUBKQAANwAAIABBupUBKQAANwAIIABBwpUBKQAANwAQIABBypUBKQAANwAYIABB0pUBLgAAOwAgIABBADoAIiABQQw6AMABIAFBxAFqIgBBCjoACyAAQdWVASkAADcAACAAQd2VAS4AADsACCAAQQA6AAogAUENOgDQASABQdQBaiIAQQo6AAsgAEHglQEpAAA3AAAgAEHolQEuAAA7AAggAEEAOgAKIAFBDjoA4AEgAUHkAWoiAEEKOgALIABB65UBKQAANwAAIABB85UBLgAAOwAIIABBADoACiABQQ86APABIAFB9AFqIgBBCjoACyAAQfaVASkAADcAACAAQf6VAS4AADsACCAAQQA6AAogAUEQOgCAAiABQYQCaiIAQQo6AAsgAEGBlgEpAAA3AAAgAEGJlgEuAAA7AAggAEEAOgAKIAFBEToAkAIgAUGUAmoiAEEKOgALIABBjJYBKQAANwAAIABBlJYBLgAAOwAIIABBADoACiABQRI6AKACIAFBpAJqIgBBCjoACyAAQZeWASkAADcAACAAQZ+WAS4AADsACCAAQQA6AAogAUETOgCwAiABQbQCaiIAQQo6AAsgAEGilgEpAAA3AAAgAEGqlgEuAAA7AAggAEEAOgAKIAFBFDoAwAIgAUHEAmoiAEEKOgALIABBrZYBKQAANwAAIABBtZYBLgAAOwAIIABBADoACiABQRU6ANACIAFB1AJqIgBBCjoACyAAQbiWASkAADcAACAAQcCWAS4AADsACCAAQQA6AAogAUEWOgDgAiABQeQCaiIAQQo6AAsgAEHDlgEpAAA3AAAgAEHLlgEuAAA7AAggAEEAOgAKIAFBFzoA8AIgAUH0AmoiAEEKOgALIABBzpYBKQAANwAAIABB1pYBLgAAOwAIIABBADoACiABQRg6AIADIAFBhANqIgBBCjoACyAAQdmWASkAADcAACAAQeGWAS4AADsACCAAQQA6AAogAUEZOgCQAyABQZQDaiIAQQo6AAsgAEHklgEpAAA3AAAgAEHslgEuAAA7AAggAEEAOgAKIAFBGjoAoAMgAUGkA2oiAEEKOgALIABB75YBKQAANwAAIABB95YBLgAAOwAIIABBADoACiABQRs6ALADIAFBtANqIgBBCjoACyAAQfqWASkAADcAACAAQYKXAS4AADsACCAAQQA6AAogAUEcOgDAAyABQcQDaiIAQQo6AAsgAEGFlwEpAAA3AAAgAEGNlwEuAAA7AAggAEEAOgAKIAFBHToA0AMgAUHUA2oiAEEKOgALIABBkJcBKQAANwAAIABBmJcBLgAAOwAIIABBADoACiABQR46AOADIAFB5ANqIgBBCjoACyAAQZuXASkAADcAACAAQaOXAS4AADsACCAAQQA6AAogAUEfOgDwAyABQfQDaiIAQQo6AAsgAEGmlwEpAAA3AAAgAEGulwEuAAA7AAggAEEAOgAKIAFBIDoAgAQgAUGEBGoiAEEKOgALIABBsZcBKQAANwAAIABBuZcBLgAAOwAIIABBADoACiABQSE6AJAEIAFBlARqIgBBCjoACyAAQbyXASkAADcAACAAQcSXAS4AADsACCAAQQA6AAogAUEiOgCgBCABQaQEaiIAQQo6AAsgAEHHlwEpAAA3AAAgAEHPlwEuAAA7AAggAEEAOgAKIAFBIzoAsAQgAUG0BGoiAEEKOgALIABB0pcBKQAANwAAIABB2pcBLgAAOwAIIABBADoACiABQSQ6AMAEIAFBxARqIgBBCjoACyAAQd2XASkAADcAACAAQeWXAS4AADsACCAAQQA6AAogAUElOgDQBCABQdQEaiIAQQo6AAsgAEHolwEpAAA3AAAgAEHwlwEuAAA7AAggAEEAOgAKIAFBJzoA4AQgAUHkBGoiAEEKOgALIABB85cBKQAANwAAIABB+5cBLgAAOwAIIABBADoACiABQSg6APAEIAFB9ARqIgBBCjoACyAAQZuXASkAADcAACAAQaOXAS4AADsACCAAQQA6AAogAUEpOgCABSABQYQFaiIAQQo6AAsgAEH+lwEpAAA3AAAgAEGGmAEuAAA7AAggAEEAOgAKIAFBKjoAkAUgAUGUBWoiAEEKOgALIABBiZgBKQAANwAAIABBkZgBLgAAOwAIIABBADoACiABQSs6AKAFIAFBpAVqIgBBCjoACyAAQZSYASkAADcAACAAQZyYAS4AADsACCAAQQA6AAogAUEsOgCwBSABQbQFaiIAQQo6AAsgAEGfmAEpAAA3AAAgAEGnmAEuAAA7AAggAEEAOgAKIAFBLToAwAUgAUHEBWoiAEEKOgALIABBqpgBKQAANwAAIABBspgBLgAAOwAIIABBADoACiABQS46ANAFIAFB1AVqIgBBCjoACyAAQbWYASkAADcAACAAQb2YAS4AADsACCAAQQA6AAogAUEvOgDgBSABQeQFaiIAQQo6AAsgAEHAmAEpAAA3AAAgAEHImAEuAAA7AAggAEEAOgAKIAFBMDoA8AUgAUH0BWoiAEEKOgALIABBy5gBKQAANwAAIABB05gBLgAAOwAIIABBADoACiABQTE6AIAGIAFBhAZqIgBBCjoACyAAQdaYASkAADcAACAAQd6YAS4AADsACCAAQQA6AAogAUEyOgCQBiABQZQGaiIAQQo6AAsgAEHhmAEpAAA3AAAgAEHpmAEuAAA7AAggAEEAOgAKIAFBMzoAoAYgAUGkBmoiAEEKOgALIABB7JgBKQAANwAAIABB9JgBLgAAOwAIIABBADoACiABQTQ6ALAGIAFBtAZqIgBBCjoACyAAQfeYASkAADcAACAAQf+YAS4AADsACCAAQQA6AAogAUE1OgDABiABQcQGaiIAQQo6AAsgAEGCmQEpAAA3AAAgAEGKmQEuAAA7AAggAEEAOgAKIAFBNjoA0AYgAUHUBmoiAEEKOgALIABBjZkBKQAANwAAIABBlZkBLgAAOwAIIABBADoACiABQTc6AOAGIAFB5AZqIgBBCjoACyAAQZiZASkAADcAACAAQaCZAS4AADsACCAAQQA6AAogAUE4OgDwBiABQfQGaiIAQQo6AAsgAEGjmQEpAAA3AAAgAEGrmQEuAAA7AAggAEEAOgAKIAFBOToAgAcgAUGEB2oiAEEKOgALIABBrpkBKQAANwAAIABBtpkBLgAAOwAIIABBADoACiABQTo6AJAHIAFBlAdqIgBBCjoACyAAQbmZASkAADcAACAAQcGZAS4AADsACCAAQQA6AAogAUE7OgCgByABQaQHaiIAQQo6AAsgAEHEmQEpAAA3AAAgAEHMmQEuAAA7AAggAEEAOgAKIAFBPDoAsAcgAUG0B2oiAEEKOgALIABBz5kBKQAANwAAIABB15kBLgAAOwAIIABBADoACiABQT06AMAHIAFBxAdqIgBBCjoACyAAQdqZASkAADcAACAAQeKZAS4AADsACCAAQQA6AAogAUE+OgDQByABQdQHaiIAQQo6AAsgAEHlmQEpAAA3AAAgAEHtmQEuAAA7AAggAEEAOgAKIAFBPzoA4AcgAUHkB2oiAEEKOgALIABB8JkBKQAANwAAIABB+JkBLgAAOwAIIABBADoACiABQcEAOgDwByABQfQHaiIAQQo6AAsgAEH7mQEpAAA3AAAgAEGDmgEuAAA7AAggAEEAOgAKIAFBgAhqQcIAOgAAIAFBhAhqIgBBCjoACyAAQYaaASkAADcAACAAQY6aAS4AADsACCAAQQA6AAogAUGQCGpBwwA6AAAgAUGUCGoiAEEKOgALIABBkZoBKQAANwAAIABBmZoBLgAAOwAIIABBADoACiABQaAIakHEADoAACABQaQIaiIAQQo6AAsgAEGcmgEpAAA3AAAgAEGkmgEuAAA7AAggAEEAOgAKIAFBsAhqQcUAOgAAIAFBtAhqIgBBCjoACyAAQaeaASkAADcAACAAQa+aAS4AADsACCAAQQA6AAogAUHACGpBxgA6AAAgAUHECGoiAEEKOgALIABBspoBKQAANwAAIABBupoBLgAAOwAIIABBADoACiABQdAIakHHADoAACABQdQIaiIAQQo6AAsgAEG9mgEpAAA3AAAgAEHFmgEuAAA7AAggAEEAOgAKIAFB4AhqQcgAOgAAIAFB5AhqIgBBCjoACyAAQciaASkAADcAACAAQdCaAS4AADsACCAAQQA6AAogAUHwCGpByQA6AAAgAUH0CGoiAEEKOgALIABB05oBKQAANwAAIABB25oBLgAAOwAIIABBADoACiABQYAJakHKADoAACABQYQJaiIAQQo6AAsgAEHemgEpAAA3AAAgAEHmmgEuAAA7AAggAEEAOgAKIAFBkAlqQcsAOgAAIAFBlAlqIgBBCjoACyAAQemaASkAADcAACAAQfGaAS4AADsACCAAQQA6AAogAUGgCWpBzAA6AAAgAUGkCWoiAEEKOgALIABB9JoBKQAANwAAIABB/JoBLgAAOwAIIABBADoACiABQbAJakHNADoAACABQbQJaiIAQQo6AAsgAEH/mgEpAAA3AAAgAEGHmwEuAAA7AAggAEEAOgAKIAFBwAlqQc4AOgAAIAFBxAlqIgBBCjoACyAAQYqbASkAADcAACAAQZKbAS4AADsACCAAQQA6AAogAUHQCWpBzwA6AAAgAUHUCWoiAEEKOgALIABBlZsBKQAANwAAIABBnZsBLgAAOwAIIABBADoACiABQeAJakHQADoAACABQeQJaiIAQQo6AAsgAEGgmwEpAAA3AAAgAEGomwEuAAA7AAggAEEAOgAKIAFB8AlqQdEAOgAAIAFB9AlqIgBBCjoACyAAQaubASkAADcAACAAQbObAS4AADsACCAAQQA6AAogAUGACmpB0gA6AAAgAUGECmoiAEEKOgALIABBtpsBKQAANwAAIABBvpsBLgAAOwAIIABBADoACiABQZAKakHTADoAACABQZQKaiIAQQo6AAsgAEHBmwEpAAA3AAAgAEHJmwEuAAA7AAggAEEAOgAKIAFBoApqQdQAOgAAIAFBpApqIgBBCjoACyAAQcybASkAADcAACAAQdSbAS4AADsACCAAQQA6AAogAUGwCmpB1QA6AAAgAUG0CmoiAEEKOgALIABB15sBKQAANwAAIABB35sBLgAAOwAIIABBADoACiABQcAKakHWADoAACABQcQKaiIAQQo6AAsgAEHimwEpAAA3AAAgAEHqmwEuAAA7AAggAEEAOgAKIAFB0ApqQdcAOgAAIAFB1ApqIgBBCjoACyAAQe2bASkAADcAACAAQfWbAS4AADsACCAAQQA6AAogAUHgCmpB2AA6AAAgAUHkCmoiAEEKOgALIABB+JsBKQAANwAAIABBgJwBLgAAOwAIIABBADoACiABQfAKakHZADoAACABQfQKaiIAQQo6AAsgAEGDnAEpAAA3AAAgAEGLnAEuAAA7AAggAEEAOgAKIAFBgAtqQdoAOgAAIAFBhAtqIgBBCjoACyAAQY6cASkAADcAACAAQZacAS4AADsACCAAQQA6AAogAUGQC2pB2wA6AAAgAUGUC2oiAEEKOgALIABBmZwBKQAANwAAIABBoZwBLgAAOwAIIABBADoACiABQaALakHcADoAACABQaQLaiIAQQo6AAsgAEGknAEpAAA3AAAgAEGsnAEuAAA7AAggAEEAOgAKIAFBsAtqQd0AOgAAIAFBtAtqIgBBCjoACyAAQa+cASkAADcAACAAQbecAS4AADsACCAAQQA6AAogAUHAC2pB3gA6AAAgAUHEC2oiAEEKOgALIABBupwBKQAANwAAIABBwpwBLgAAOwAIIABBADoACiABQdALakHfADoAACABQdQLaiIAQQo6AAsgAEHFnAEpAAA3AAAgAEHNnAEuAAA7AAggAEEAOgAKIAFB4AtqQeYAOgAAIAFB5AtqIgBCADcCACAAQQA2AgggAEEQEOAFIgA2AgAgAUHsC2pBkICAgHg2AgAgAUHoC2pBCzYCACAAQdCcASkAADcAACAAQdicAS4AADsACCAAQdqcASwAADoACiAAQQA6AAsgAUHwC2pB5wA6AAAgAUH0C2oiAEIANwIAIABBADYCCCAAQRAQ4AUiADYCACABQfwLakGQgICAeDYCACABQfgLakELNgIAIABB3JwBKQAANwAAIABB5JwBLgAAOwAIIABB5pwBLAAAOgAKIABBADoACyABQYAMakHoADoAACABQYQMaiIAQgA3AgAgAEEANgIIIABBEBDgBSIANgIAIAFBjAxqQZCAgIB4NgIAIAFBiAxqQQs2AgAgAEHonAEpAAA3AAAgAEHwnAEuAAA7AAggAEHynAEsAAA6AAogAEEAOgALIAFBkAxqQekAOgAAIAFBlAxqIgBCADcCACAAQQA2AgggAEEQEOAFIgA2AgAgAUGcDGpBkICAgHg2AgAgAUGYDGpBCzYCACAAQfScASkAADcAACAAQfycAS4AADsACCAAQf6cASwAADoACiAAQQA6AAsgAUGgDGpB6gA6AAAgAUGkDGoiAEIANwIAIABBADYCCCAAQRAQ4AUiADYCACABQawMakGQgICAeDYCACABQagMakELNgIAIABBgJ0BKQAANwAAIABBiJ0BLgAAOwAIIABBip0BLAAAOgAKIABBADoACyABQbAMakHrADoAACABQbQMaiIAQgA3AgAgAEEANgIIIABBEBDgBSIANgIAIAFBvAxqQZCAgIB4NgIAIAFBuAxqQQs2AgAgAEGMnQEpAAA3AAAgAEGUnQEuAAA7AAggAEGWnQEsAAA6AAogAEEAOgALIAFBwAxqQewAOgAAIAFBxAxqIgBCADcCACAAQQA2AgggAEEQEOAFIgA2AgAgAUHMDGpBkICAgHg2AgAgAUHIDGpBCzYCACAAQZidASkAADcAACAAQaCdAS4AADsACCAAQaKdASwAADoACiAAQQA6AAsgAUHQDGpB7QA6AAAgAUHUDGoiAEIANwIAIABBADYCCCAAQRAQ4AUiADYCACABQdwMakGQgICAeDYCACABQdgMakELNgIAIABBpJ0BKQAANwAAIABBrJ0BLgAAOwAIIABBrp0BLAAAOgAKIABBADoACyABQeAMakHuADoAACABQeQMaiIAQgA3AgAgAEEANgIIIABBEBDgBSIANgIAIAFB7AxqQZCAgIB4NgIAIAFB6AxqQQs2AgAgAEGwnQEpAAA3AAAgAEG4nQEuAAA7AAggAEG6nQEsAAA6AAogAEEAOgALIAFB8AxqQe8AOgAAIAFB9AxqIgBCADcCACAAQQA2AgggAEEQEOAFIgA2AgAgAUH8DGpBkICAgHg2AgAgAUH4DGpBCzYCACAAQbydASkAADcAACAAQcSdAS4AADsACCAAQcadASwAADoACiAAQQA6AAsgAUGADWpB8AA6AAAgAUGEDWoiAEIANwIAIABBADYCCCAAQRAQ4AUiADYCACABQYwNakGQgICAeDYCACABQYgNakELNgIAIABByJ0BKQAANwAAIABB0J0BLgAAOwAIIABB0p0BLAAAOgAKIABBADoACyABQZANakHxADoAACABQZQNaiIAQgA3AgAgAEEANgIIIABBEBDgBSIANgIAIAFBnA1qQZCAgIB4NgIAIAFBmA1qQQs2AgAgAEHUnQEpAAA3AAAgAEHcnQEuAAA7AAggAEHenQEsAAA6AAogAEEAOgALIAFBoA1qQfIAOgAAIAFBpA1qIgBCADcCACAAQQA2AgggAEEQEOAFIgA2AgAgAUGsDWpBkICAgHg2AgAgAUGoDWpBCzYCACAAQeCdASkAADcAACAAQeidAS4AADsACCAAQeqdASwAADoACiAAQQA6AAsgAUGwDWpB8wA6AAAgAUG0DWoiAEIANwIAIABBADYCCCAAQRAQ4AUiADYCACABQbwNakGQgICAeDYCACABQbgNakELNgIAIABB7J0BKQAANwAAIABB9J0BLgAAOwAIIABB9p0BLAAAOgAKIABBADoACyABQcANakH0ADoAACABQcQNaiIAQgA3AgAgAEEANgIIIABBEBDgBSIANgIAIAFBzA1qQZCAgIB4NgIAIAFByA1qQQs2AgAgAEH4nQEpAAA3AAAgAEGAngEuAAA7AAggAEGCngEsAAA6AAogAEEAOgALIAFB0A1qQfUAOgAAIAFB1A1qIgBCADcCACAAQQA2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iKABKQAANwAIIABBADoAECAuQwAAAAA4AgwgLkMAAIA/OAIQIAEgAjYCyAMgAUHMA2ogLhDnBSABIC4pAgw3AtgDQZGgARCgASECIC9BEBDgBSIANgIAIC9BkICAgHg2AgggL0EPNgIEIABBkaABKQAANwAAIABBmaABKAAANgAIIABBnaABLgAAOwAMIABBn6ABLAAAOgAOIABBADoADyAvQwAAAAA4AgwgL0MAAIA/OAIQIAEgAjYC4AMgAUHkA2ogLxDnBSABIC8pAgw3AvADQaGgARCgASECIDBBIBDgBSIANgIAIDBBoICAgHg2AgggMEESNgIEIABBoaABKQAANwAAIABBqaABKQAANwAIIABBsaABLgAAOwAQIABBADoAEiAwQwAAAAA4AgwgMEMAAIA/OAIQIAEgAjYC+AMgAUH8A2ogMBDnBSABIDApAgw3AogEQcqJARCgASECIDFBIBDgBSIANgIAIDFBoICAgHg2AgggMUERNgIEIABByokBKQAANwAAIABB0okBKQAANwAIIABB2okBLAAAOgAQIABBADoAESAxQwAAAAA4AgwgMUMAAIA/OAIQIAEgAjYCkAQgAUGUBGogMRDnBSABIDEpAgw3AqAEQbSgARCgASECIDJBIBDgBSIANgIAIDJBoICAgHg2AgggMkEWNgIEIABBtKABKQAANwAAIABBvKABKQAANwAIIABBxKABKAAANgAQIABByKABLgAAOwAUIABBADoAFiAyQwAAAAA4AgwgMkMAAIA/OAIQIAEgAjYCqAQgAUGsBGogMhDnBSABIDIpAgw3ArgEQcugARCgASECIDNBIBDgBSIANgIAIDNBoICAgHg2AgggM0EQNgIEIABBy6ABKQAANwAAIABB06ABKQAANwAIIABBADoAECAzQwAAAAA4AgwgM0MAAIA/OAIQIAEgAjYCwAQgAUHEBGogMxDnBSABIDMpAgw3AtAEQdygARCgASECIDRBEBDgBSIANgIAIDRBkICAgHg2AgggNEEMNgIEIABB3KABKQAANwAAIABB5KABKAAANgAIIABBADoADCA0QwAAAAA4AgwgNEMAAIA/OAIQIAEgAjYC2AQgAUHcBGogNBDnBSABIDQpAgw3AugEQemgARCgASECIDVBEBDgBSIANgIAIDVBkICAgHg2AgggNUEPNgIEIABB6aABKQAANwAAIABB8aABKAAANgAIIABB9aABLgAAOwAMIABB96ABLAAAOgAOIABBADoADyA1QwAAAAA4AgwgNUMAAIA/OAIQIAEgAjYC8AQgAUH0BGogNRDnBSABIDUpAgw3AoAFQfmgARCgASECIDZBIBDgBSIANgIAIDZBoICAgHg2AgggNkEWNgIEIABB+aABKQAANwAAIABBgaEBKQAANwAIIABBiaEBKAAANgAQIABBjaEBLgAAOwAUIABBADoAFiA2QwAAAAA4AgwgNkMAAIA/OAIQIAEgAjYCiAUgAUGMBWogNhDnBSABIDYpAgw3ApgFQZChARCgASECIDdBIBDgBSIANgIAIDdBoICAgHg2AgggN0EQNgIEIABBkKEBKQAANwAAIABBmKEBKQAANwAIIABBADoAECA3QwAAAAA4AgwgN0MAAIA/OAIQIAEgAjYCoAUgAUGkBWogNxDnBSABIDcpAgw3ArAFQaGhARCgASECIDhBEBDgBSIANgIAIDhBkICAgHg2AgggOEEMNgIEIABBoaEBKQAANwAAIABBqaEBKAAANgAIIABBADoADCA4QwAAAAA4AgwgOEMAAIA/OAIQIAEgAjYCuAUgAUG8BWogOBDnBSABIDgpAgw3AsgFQa6hARCgASECIDlBEBDgBSIANgIAIDlBkICAgHg2AgggOUEPNgIEIABBrqEBKQAANwAAIABBtqEBKAAANgAIIABBuqEBLgAAOwAMIABBvKEBLAAAOgAOIABBADoADyA5QwAAAAA4AgwgOUMAAIA/OAIQIAEgAjYC0AUgAUHUBWogORDnBSABIDkpAgw3AuAFQb6hARCgASECIDpBEBDgBSIANgIAIDpBkICAgHg2AgggOkEONgIEIABBvqEBKQAANwAAIABBxqEBKAAANgAIIABByqEBLgAAOwAMIABBADoADiA6QwAAAAA4AgwgOkMAAIA/OAIQIAEgAjYC6AUgAUHsBWogOhDnBSABIDopAgw3AvgFQc2hARCgASECIDtBIBDgBSIANgIAIDtBoICAgHg2AgggO0EQNgIEIABBzaEBKQAANwAAIABB1aEBKQAANwAIIABBADoAECA7QwAAAAA4AgwgO0MAAIA/OAIQIAEgAjYCgAYgAUGEBmogOxDnBSABIDspAgw3ApAGQd6hARCgASECIDxBEBDgBSIANgIAIDxBkICAgHg2AgggPEEPNgIEIABB3qEBKQAANwAAIABB5qEBKAAANgAIIABB6qEBLgAAOwAMIABB7KEBLAAAOgAOIABBADoADyA8QwAAAAA4AgwgPEMAAIA/OAIQIAEgAjYCmAYgAUGcBmogPBDnBSABIDwpAgw3AqgGQdyJARCgASECID1BIBDgBSIANgIAID1BoICAgHg2AgggPUESNgIEIABB3IkBKQAANwAAIABB5IkBKQAANwAIIABB7IkBLgAAOwAQIABBADoAEiA9QwAAAAA4AgwgPUMAAIA/OAIQIAEgAjYCsAYgAUG0BmogPRDnBSABID0pAgw3AsAGQe6hARCgASECID5BIBDgBSIANgIAID5BoICAgHg2AgggPkERNgIEIABB7qEBKQAANwAAIABB9qEBKQAANwAIIABB/qEBLAAAOgAQIABBADoAESA+QwAAAAA4AgwgPkMAAIA/OAIQIAEgAjYCyAYgAUHMBmogPhDnBSABID4pAgw3AtgGQYCiARCgASEAIB1BgICAODYCCCAdQYCiASgAADYAACAdQYSiAS4AADsABCAdQYaiASwAADoABiAdQQA6AAcgHUMAAAAAOAIMIB1DAACAPzgCECABIAA2AuAGIAFB5AZqIB0Q5wUgASAdKQIMNwLwBkGIogEQoAEhACADQYCAgDg2AgggA0GIogEoAAA2AAAgA0GMogEuAAA7AAQgA0GOogEsAAA6AAYgA0EAOgAHIANDAAAAADgCDCADQwAAgD84AhAgASAANgL4BiABQfwGaiADEOcFIAEgAykCDDcCiAdBkKIBEKABIQAgGEIANwMAIBhBADYCCCAYQQg6AAsgGELszL2Dha3YueUANwMAIBhBADoACCAYQwAAAAA4AgwgGEPbD8lAOAIQIAEgADYCkAcgAUGUB2ogGBDnBSABIBgpAgw3AqAHQZmiARCgASEAIBlCADcCACAZQQA2AgggGUEJOgALIBlBmaIBKQAANwAAIBlBoaIBLAAAOgAIIBlBADoACSAZQwAAgL84AgwgGUMAAIA/OAIQIAEgADYCqAcgAUGsB2ogGRDnBSABIBkpAgw3ArgHQejmAUEANgIAQezmAUEANgIAQfDmAUEANgIAQezmAUHABxDgBSICNgIAQejmASACNgIAQfDmASACQcAHajYCACABQcAHaiEY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EPEBIQggACADQQFqQQJ0aigCACAFEPEBIgMgAUkgCCABIANrSXFFBEBBACEBDAYLIAAgAyAIamosAAAEQEEAIQEMBgsgAiAAIANqEOYBIgNFDQAgA0EASCEDIARBAUYEQEEAIQEMBgUgBCAGayEEIANFBEAgCyEHCyADBEAgBiEECwwCCwALCyAAIAwgCmoiAkECdGooAgAgBRDxASEEIAAgAkEBakECdGooAgAgBRDxASICIAFJIAQgASACa0lxBEAgACACaiEBIAAgAiAEamosAAAEQEEAIQELBUEAIQELCwVBACEBCwVBACEBCwsgAQsVAQF/IAAQvAYhAiABBH8gAgUgAAsLtwIBAX8CQCAAQQNxBEADQAJAAkAgACwAAA47AAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQABCwwDCyAAQQFqIgBBA3ENAAsLAkAgACgCACIBQYCBgoR4cUGAgYKEeHMgAUH//ft3anFFBEADQCABQYCBgoR4cUGAgYKEeHMgAUG69OjRA3NB//37d2pxDQIgAEEEaiIAKAIAIgFBgIGChHhxQYCBgoR4cyABQf/9+3dqcUUNAAsLCwNAIABBAWohAQJAAkAgACwAAA47AAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQABCwwCCyABIQAMAAsACyAACycAIwchASMHQRBqJAcgASACNgIAIABBqNMBIAEQ9AEhACABJAcgAAuwAQEBfyMHIQMjB0GAAWokByADQgA3AgAgA0IANwIIIANCADcCECADQgA3AhggA0IANwIgIANCADcCKCADQgA3AjAgA0IANwI4IANBQGtCADcCACADQgA3AkggA0IANwJQIANCADcCWCADQgA3AmAgA0IANwJoIANCADcCcCADQQA2AnggA0EXNgIgIAMgADYCLCADQX82AkwgAyAANgJUIAMgASACEPYBIQAgAyQHIAALCwAgACABIAIQiwILthcDG38BfgF8IwchEyMHQaACaiQHIBNBCGohFSATQRFqIQwgEyEXIBNBEGohGCAAKAJMGgJAIAEsAAAiBwRAIABBBGohBSAAQeQAaiENIABB7ABqIREgAEEIaiES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fSADBSAACwsLpQMDAn8BfgJ8IAC9IgNCP4inIQECfAJ/AkAgA0IgiKdB/////wdxIgJBqsaYhARLBHwgA0L///////////8Ag0KAgICAgICA+P8AVgRAIAAPCyAARO85+v5CLoZAZARAIABEAAAAAAAA4H+iDwUgAETSvHrdKyOGwGMgAERRMC3VEEmHwGNxRQ0CRAAAAAAAAAAADwsABSACQcLc2P4DSwRAIAJBscXC/wNLDQIgAUEBcyABawwDCyACQYCAwPEDSwR8RAAAAAAAAAAAIQVBACEBIAAFIABEAAAAAAAA8D+gDwsLDAILIABE/oIrZUcV9z+iIAFBA3RBuA5qKwMAoKoLIQEgACABtyIERAAA4P5CLuY/oqEiACAERHY8eTXvOeo9oiIFoQshBCAAIAQgBCAEIASiIgAgACAAIAAgAETQpL5yaTdmPqJE8WvSxUG9u76gokQs3iWvalYRP6CiRJO9vhZswWa/oKJEPlVVVVVVxT+goqEiAKJEAAAAAAAAAEAgAKGjIAWhoEQAAAAAAADwP6AhACABRQRAIAAPCyAAIAEQggILswICA38CfSAAvCIBQR92IQICfQJ/AkAgAUH/////B3EiAUHP2LqVBEsEfSABQYCAgPwHSwRAIAAPCyABQZjkxZUESSACQQBHIgNyBEAgAyABQbTjv5YES3FFDQJDAAAAAA8FIABDAAAAf5QPCwAFIAFBmOTF9QNLBEAgAUGSq5T8A0sNAiACQQFzIAJrDAMLIAFBgICAyANLBH1DAAAAACEFQQAhASAABSAAQwAAgD+SDwsLDAILIABDO6q4P5QgAkECdEGAygBqKgIAkqgLIQEgACABsiIEQwByMT+UkyIAIARDjr6/NZQiBZMLIQQgACAEIAQgBCAElCIAQ4+qKj4gAEMVUjU7lJOUkyIAlEMAAABAIACTlSAFk5JDAACAP5IhACABRQRAIAAPCyAAIAEQvAILnwMDAn8BfgV8IAC9IgNCIIinIQECfyADQgBTIgIgAUGAgMAASXIEfyADQv///////////wCDQgBRBEBEAAAAAAAA8L8gACAAoqMPCyACRQRAIABEAAAAAAAAUEOivSIDQiCIpyEBIANC/////w+DIQNBy3cMAgsgACAAoUQAAAAAAAAAAKMPBSABQf//v/8HSwRAIAAPCyADQv////8P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AwgLIAMkBwu4AQEFfyMHIQMjB0EwaiQHIANBEGohBCADIQUgACAAKAIAQXRqKAIAaiICIAIoAhBBfXEQ6gIgA0EgaiICIAAQ7wIgAiwAAARAIAAgACgCAEF0aigCAGooAhgiBigCACgCFCECIAQgASkDADcDACAEIAEpAwg3AwggBSAGIARBCCACQQ9xQa8FahEKACAFKQMIQn9RBEAgACAAKAIAQXRqKAIAaiIBIAEoAhBBBHIQ6gILCyADJAcgAAscACAABEAgACAAKAIAKAIEQf8BcUHbAmoRAAALC1kBAX8CfwJAA38CfyADIARGDQJBfyABIAJGDQAaQX8gASwAACIAIAMsAAAiBUgNABogBSAASAR/QQEFIANBAWohAyABQQFqIQEMAgsLCwwBCyABIAJHCyIACxkAIABCADcCACAAQQA2AgggACACIAMQ+gILPwEBf0EAIQADQCABIAJHBEAgAEEEdCABLAAAaiIAQYCAgIB/cSIDQRh2IANyIABzIQAgAUEBaiEBDAELCyAAC4QBAQN/IAIgAWsiA0FvSwRAEKwECyADQQtJBEAgACADOgALBSAAIANBEGpBcHEiBRDgBSIENgIAIAAgBUGAgICAeHI2AgggACADNgIEIAQhAAsgACEEA0AgASACRwRAIAQgASwAABD7AiABQQFqIQEgBEEBaiEEDAELCyAAIANqQQAQ+wILCQAgACABOgAAC1kBAX8CfwJAA38CfyADIARGDQJBfyABIAJGDQAaQX8gASgCACIAIAMoAgAiBUgNABogBSAASAR/QQEFIANBBGohAyABQQRqIQEMAgsLCwwBCyABIAJHCyIACxkAIABCADcCACAAQQA2AgggACACIAMQ/wILPwEBf0EAIQADQCABIAJHBEAgASgCACAAQQR0aiIAQYCAgIB/cSIDQRh2IANyIABzIQAgAUEEaiEBDAELCyAAC5YBAQN/IAIgAWtBAnUiBEHv////A0sEQBCsBAsgBEECSQRAIAAgBDoACyAAIQMFIARBBGpBfHEiBUH/////A0sEQBAcBSAAIAVBAnQQ4AUiAzYCACAAIAVBgICAgHhyNgIIIAAgBDYCBAsLA0AgASACRwRAIAMgASgCABCAAyABQQRqIQEgA0EEaiEDDAELCyADQQAQgAMLCQAgACABNgIAC/ICAQd/IwchByMH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AAucAQEEfyAAQQtqIgQsAAAiAkEASCIFBH8gACgCBCEDIAAoAghB/////wdxQX9qBSACQf8BcSEDQQoLIQICQAJAIAMgAkYEQCAAIAJBASACIAIQ9QUgBCwAAEEASA0BBSAFDQELIAQgA0EBajoAAAwBCyAAKAIAIQIgACADQQFqNgIEIAIhAAsgACADaiIAIAEQ+wIgAEEBakEAEPsCC6EBAQV/IABBC2oiBiwAACIFQQBIIgMEfyAAKAIEBSAFQf8BcQsiByABSQRAEKwECyACBEAgAwR/IAAoAgAFIAALIQMgByABayIEIAJJBEAgBCECCyAEIAJrIgQEQCADIAFqIgEgASACaiAEEO8FGiAGLAAAIQULIAcgAmshASAFQQBIBEAgACABNgIEBSAGIAE6AAALIAMgAWpBABD7AgsgAAsWACABBH8gACACEOICIAEQjAIFQQALC1cBAX8gACwACyICQQBIBEAgACgCBCECIAAoAgAhAAUgAkH/AXEhAgsgAiABSwRAIAAgAWogAiABa0E6EPkFIgEgAGshACABRQRAQX8hAAsFQX8hAAsgAAt4AQJ/IAJB7////wNLBEAQrAQLIAJBAkkEQCAAIAI6AAsgACEDBSACQQRqQXxxIgRB/////wNLBEAQHAUgACAEQQJ0EOAFIgM2AgAgACAEQYCAgIB4cjYCCCAAIAI2AgQLCyADIAEgAhDkAiADIAJBAnRqQQAQgAMLeAECfyABQe////8DSwRAEKwECyABQQJJBEAgACABOgALIAAhAwUgAUEEakF8cSIEQf////8DSwRAEBwFIAAgBEECdBDgBSIDNgIAIAAgBEGAgICAeHI2AgggACABNgIECwsgAyABIAIQ/QUgAyABQQJ0akEAEIADCxEAIAEEQCAAIAIgARDJAhoLC54BAQR/IABBCGoiA0EDaiIELAAAIgZBAEgiBQR/IAMoAgBB/////wdxQX9qBUEBCyIDIAJJBEAgACADIAIgA2sgBQR/IAAoAgQFIAZB/wFxCyIEQQAgBCACIAEQgAYFIAUEfyAAKAIABSAACyIDIAEgAhD/BSADIAJBAnRqQQAQgAMgBCwAAEEASARAIAAgAjYCBAUgBCACOgAACwsgAAsRACACBEAgACABIAIQygIaCwudAgEEf0Hu////AyABayACSQRAEKwECyAAQQhqIgssAANBAEgEfyAAKAIABSAACyEJIAFB5////wFJBEAgAiABaiICIAFBAXQiCEkEfyAIBSACIggLQQRqQXxxIQIgCEECSQR/QQIiAgUgAgtB/////wNLBEAQHAUgAiEKCwVB7////wMhCgsgCkECdBDgBSEIIAQEQCAIIAkgBBDkAgsgBgRAIAggBEECdGogByAGEOQCCyADIAVrIgMgBGsiAgRAIAggBEECdGogBkECdGogCSAEQQJ0aiAFQQJ0aiACEOQCCyABQQFHBEAgCRDhBQsgACAINgIAIAsgCkGAgICAeHI2AgAgACADIAZqIgA2AgQgCCAAQQJ0akEAEIADC7ACAQl/IABBCGoiB0EDaiIJLAAAIgZBAEgiAwR/IAAoAgQhBCAHKAIAQf////8HcUF/agUgBkH/AXEhBEEBCyEBIARBBGpBfHFBf2ohAgJAIARBAkkiBQR/QQEFIAILIgggAUcEQAJAAkAgBQRAIAAoAgAhASADBH9BACEDIAAFIAAgASAGQf8BcUEBahDkAiABEOEFDAMLIQIFIAhBAWoiAUH/////A0sEQBAcCyABQQJ0EOAFIQIgAwR/QQEhAyAAKAIABSACIAAgBkH/AXFBAWoQ5AIgAEEEaiEFDAILIQELIAIgASAAQQRqIgUoAgBBAWoQ5AIgARDhBSADRQ0BIAhBAWohAQsgByABQYCAgIB4cjYCACAFIAQ2AgAgACACNgIADAILIAkgBDoAAAsLCw4AIAAgASABEI4EEP4FC98BAQR/Qe////8DIAFrIAJJBEAQrAQLIABBCGoiCCwAA0EASAR/IAAoAgAFIAALIQYgAUHn////AUkEQCACIAFqIgIgAUEBdCIFSQR/IAUFIAIiBQtBBGpBfHEhAiAFQQJJBH9BAiICBSACC0H/////A0sEQBAcBSACIQcLBUHv////AyEHCyAHQQJ0EOAFIQUgBARAIAUgBiAEEOQCCyADIARrIgIEQCAFIARBAnRqIAYgBEECdGogAhDkAgsgAUEBRwRAIAYQ4QULIAAgBTYCACAIIAdBgICAgHhyNgIAC7QBAQR/IABBCGoiBEEDaiIFLAAAIgNBAEgiBgR/IAAoAgQhAyAEKAIAQf////8HcUF/agUgA0H/AXEhA0EBCyIEIANrIAJJBEAgACAEIAMgAmogBGsgAyADQQAgAiABEIAGBSACBEAgBgR/IAAoAgAFIAALIgQgA0ECdGogASACEOQCIAMgAmohASAFLAAAQQBIBEAgACABNgIEBSAFIAE6AAALIAQgAUECdGpBABCAAwsLIAALpAEBBH8gAEEIaiICQQNqIgQsAAAiA0EASCIFBH8gACgCBCEDIAIoAgBB/////wdxQX9qBSADQf8BcSEDQQELIQICQAJAIAMgAkYEQCAAIAJBASACIAIQgwYgBCwAAEEASA0BBSAFDQELIAQgA0EBajoAAAwBCyAAKAIAIQIgACADQQFqNgIEIAIhAAsgACADQQJ0aiIAIAEQgAMgAEEEakEAEIADC0EBAX8jByEBIwdBEGokByABQgA3AgAgAUEANgIIIAFBnNoBQZzaARDpAhDoBSABIAAQhwYhACABEOwFIAEkByAACwkAIAAgARCIBguCAQEFfyMHIQMjB0EQaiQHIAMiBEEANgIAIAEoAgAhAiABLAALQQBIBEAgAiEBC0G86wEoAgAhAkG86wFBADYCACABIAQQtQIhBUG86wEoAgAhBkG86wEgAjYCACAGQSJGBEAgABCJBgsgBCgCACABRgRAIAAQigYFIAMkByAFDwtBAAseAQF/IwchASMHQRBqJAcgASAAQbXaARB/IAEQiwYLHgEBfyMHIQEjB0EQaiQHIAEgAEGh2gEQfyABEIsGCzYBAn8jByEBIwdBEGokByAAKAIAIQIgASAALAALQQBIBH8gAgUgAAs2AgBBAEEAIAEQjQIQHAtDAgF/AX0jByEBIwdBEGokByABQgA3AgAgAUEANgIIIAFBxNoBQcTaARDpAhDoBSABIAAQjQYhAiABEOwFIAEkByACCwkAIAAgARCOBguHAQIEfwF9IwchAyMHQRBqJAcgAyIEQQA2AgAgASgCACECIAEsAAtBAEgEQCACIQELQbzrASgCACECQbzrAUEANgIAIAEgBBDCAiEGQbzrASgCACEFQbzrASACNgIAIAVBIkYEQCAAEIkGCyAEKAIAIAFGBEAgABCKBgUgAyQHIAYPC0MAAAAACyYBAX8jByECIwdBEGokByACEJAGIAAgAiABEJEGIAIQ7AUgAiQHC1sBAX8gAEIANwIAIABBADYCCEEAIQEDQCABQQNHBEAgACABQQJ0akEANgIAIAFBAWohAQwBCwsgACAALAALQQBIBH8g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AAwBCwsgBCACawtRAQF/IABBAEojBigCACIBIABqIgAgAUhxIABBAEhyBEAQAxpBDBALQX8PCyMGIAA2AgAgABACSgRAEAFFBEAjBiABNgIAQQwQC0F/DwsLIAELCQAgAUEAEQgACxAAIAEgAEH/AHFBA2oRBwALEgAgASACIABBH3FBgwFqEQIACxQAIAEgAiADIABBH3FBowFqEQYACxYAIAEgAiADIAQgAEEHcUHDAWoRDAALGAAgASACIAMgBCAFIABBB3FBywFqERIACxgAIAEgAiADIAQgBSAAQR9xQdMBahENAAsaACABIAIgAyAEIAUgBiAAQQNxQfMBahETAAsaACABIAIgAyAEIAUgBiAAQT9xQfcBahELAAscACABIAIgAyAEIAUgBiAHIABBB3FBtwJqERQACx4AIAEgAiADIAQgBSAGIAcgCCAAQQ9xQb8CahEOAAsYACABIAIgAyAEIAUgAEEHcUHPAmoRFQALDgAgAEEDcUHXAmoRDwALEQAgASAAQf8BcUHbAmoRAAALEgAgASACIABBAXFB2wRqERYACxIAIAEgAiAAQT9xQd0EahEFAAsUACABIAIgAyAAQQ9xQZ0FahEBAAsWACABIAIgAyAEIABBAXFBrQVqERcACxYAIAEgAiADIAQgAEEPcUGvBWoRCgALGAAgASACIAMgBCAFIABBA3FBvwVqEREACxoAIAEgAiADIAQgBSAGIABBB3FBwwVqERAACxgAIAEgAiADIAQgBSAAQQNxQcsFahEEAAsPAEEAEABEAAAAAAAAAAALCABBARAAQQALCABBAhAAQQALCABBAxAAQQALCABBBBAAQQALCABBBRAAQQALCABBBhAAQQALCABBBxAAQQALCABBCBAAQQALCABBCRAAQQALCABBChAAQQALCABBCxAAQQALCABBDBAAQQALBgBBDRAACwYAQQ4QAAsGAEEPEAALBgBBEBAACwYAQREQAAsGAEESEAALBgBBExAACwYAQRQQAAsGAEEVEAALBgBBFhAACxkAIAAgASACIAMgBCAFrSAGrUIghoQQzAYLGQAgACABIAIgA60gBK1CIIaEIAUgBhDWBgsLwMEBJABBgAgL8gX4MQAAMTkAAKAyAAAjOQAAAAAAAAAEAACgMgAAFDkAAAEAAAAABAAAoDIAAAg5AAAAAAAAUAUA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wAjWCNYI1gjWCNYI1gjGCMYIxgjGCMYIxgjGCMYIxgjGCMYIxgjGCMYIxgjGCMYIxgjGCMYEwATABMAEwAIAQeDrAAubR2lpAHYASW5zdHJ1bWVudAB2aQBNSURJU3ludGgAdmlpaWkAc2V0UGFyYW0AZ2V0UGFyYW0AaWlpaQBsb2FkUHJlc2V0SlNPTgBWQVN5bnRoQVcAcXVldWVFdmVudAB2aWlpZABOU3QzX18yMTJiYXNpY19zdHJpbmdJY05TXzExY2hhcl90cmFpdHNJY0VFTlNfOWFsbG9jYXRvckljRUVFRQBOU3QzX18yMjFfX2Jhc2ljX3N0cmluZ19jb21tb25JTGIxRUVFAE5TdDNfXzIxNWJhc2ljX3N0cmluZ2J1ZkljTlNfMTFjaGFyX3RyYWl0c0ljRUVOU185YWxsb2NhdG9ySWNFRUVFAE5TdDNfXzIxOGJhc2ljX3N0cmluZ3N0cmVhbUljTlNfMTFjaGFyX3RyYWl0c0ljRUVOU185YWxsb2NhdG9ySWNFRUVFAE5TdDNfXzI2X19iaW5kSU0xMEluc3RydW1lbnRGdlJLZEVKUFMxX1JLTlNfMTJwbGFjZWhvbGRlcnM0X19waElMaTFFRUVFRUUATlN0M19fMjE4X193ZWFrX3Jlc3VsdF90eXBlSU0xMEluc3RydW1lbnRGdlJLZEVFRQBOU3QzX18yMTViaW5hcnlfZnVuY3Rpb25JUDEwSW5zdHJ1bWVudFJLZHZFRQBOU3QzX18yMTBfX2Z1bmN0aW9uNl9fZnVuY0lOU182X19iaW5kSU0xMEluc3RydW1lbnRGdlJLZEVKUFMzX1JLTlNfMTJwbGFjZWhvbGRlcnM0X19waElMaTFFRUVFRUVOU185YWxsb2NhdG9ySVNFX0VFRnZTNV9FRUUATlN0M19fMjEwX19mdW5jdGlvbjZfX2Jhc2VJRnZSS2RFRUUATlN0M19fMjIwX19zaGFyZWRfcHRyX2VtcGxhY2VJTlNfOGZ1bmN0aW9uSUZ2UktkRUVFTlNfOWFsbG9jYXRvcklTNV9FRUVFAFBLOVZBU3ludGhBVwBQOVZBU3ludGhBVwA5VkFTeW50aEFXAFBLN1ZBU3ludGgAUDdWQVN5bnRoAFBLOU1JRElTeW50aABQOU1JRElTeW50aABQSzEwSW5zdHJ1bWVudABQMTBJbnN0cnVtZW50ADEwSW5zdHJ1bWVudAAvdG1wLwBjaGVja1N1bSAhPSBjaGVja1N1bUJlZm9yZQAvVXNlcnMvdGFlbWluY2hvL0JhbmRMYWIvYmFuZGxhYi1hdWRpby1lbmdpbmUvZW5naW5lL0RTUC5jcHAAYm9vbCBEU1BfUnVuU2VsZlRlc3QoKQBEU1BfUnVuU2VsZlRlc3QAY1tpXSA9PSBzaG9ydFZlY1tpXQBjW2ldID09IGFbTi0xLWldAHNob3J0VmVjMltpXSA9PSBzaG9ydFZlY1tpXQBBdWRpb0VuZ2luZTogVmVyaWZ5IGZhaWxlZAoAQXVkaW9FbmdpbmU6IGV4cGVjdGVkOiAlZgoAQXVkaW9FbmdpbmU6IGFjdHVhbDogICAlZgoAQXVkaW9FbmdpbmU6IGVycm9yOiAgICAlZgoAQXVkaW9FbmdpbmU6IG1heEVycm9yOiAlZgoARFNQX1J1blNlbGZUZXN0IHZlcmlmeSBmYWlsZWQuIABmYWJzZihlcnJvcikgPD0gbWF4RXJyb3IAdm9pZCB2ZXJpZnkoZmxvYXQsIGZsb2F0LCBmbG9hdCkAdmVyaWZ5AGpzb24gbVZhbHVlVHlwZT09T2JqZWN0VmFsIHJlcXVpcmVkAGpzb24gbVZhbHVlVHlwZT09SXNOdW1lcmljKCkgcmVxdWlyZWQAanNvbiBtVmFsdWVUeXBlPT1TdHJpbmdWYWwgcmVxdWlyZWQAbnVsbABmYWxzAHRydQAvVXNlcnMvdGFlbWluY2hvL0JhbmRMYWIvYmFuZGxhYi1hdWRpby1lbmdpbmUvZW5naW5lL01JRElQYXJzZXIuY3BwAFVua25vd24gZXZlbnQgdHlwZSAweCUwMnggAEluY29ycmVjdCBsZW4gZm9yIE1FVEFfU0VRVUVOQ0VfTlVNQkVSAEluY29ycmVjdCBsZW4gZm9yIE1FVEFfU0VUX1RFTVBPAEluY29ycmVjdCBsZW4gZm9yIE1FVEFfS0VZX1NJR05BVFVSRQBVbmtub3duIG1ldGEtZXZlbnQgdHlwZSAweCUwMngAdm9pZCBNSURJRXZlbnQ6OnJlYWQoc3RkOjpfXzI6OmlzdHJlYW0gJiwgdWludDhfdCkAcmVhZAByZWFkVUludDgATUVUQV9TRVFVRU5DRV9OVU1CRVIATUVUQV9URVhUAE1FVEFfQ09QWVJJR0hUAE1FVEFfU0VRVFJBQ0tfTkFNRQBNRVRBX0lOU1RSVU1FTlRfTkFNRQBNRVRBX0xZUklDAE1FVEFfTUFSS0VSAE1FVEFfREVWSUNFX05BTUUATUVUQV9DSEFOTkVMX1BSRUZJWABNRVRBX1BPUlRfUFJFRklYAE1FVEFfRU5EX09GX1RSQUNLAE1FVEFfU0VUX1RFTVBPAE1FVEFfU01QVEVfT0ZGU0VUAE1FVEFfVElNRV9TSUdOQVRVUkUATUVUQV9LRVlfU0lHTkFUVVJFAE1FVEFfU0VRVUVOQ0VSX1NQRUNJRklDAE1FVEFfVU5LTk9XTl8weDA4AE1FVEFfVU5LTk9XTl8weDBBAE1FVEFfVU5LTk9XTl8weDBCAE1FVEFfVU5LTk9XTl8weDBDAE1FVEFfVU5LTk9XTl8weDBEAE1FVEFfVU5LTk9XTl8weDBFAE1FVEFfVU5LTk9XTl8weDBGAE5PVEVfT04AUE9MWV9BRlRFUl9UT1VDSABDT05UUk9MX0NIQU5HRQBQUk9HUkFNAENIQU5ORUxfQUZURVJfVE9VQ0gAUElUQ0hfV0hFRUwAU1lTX0VYAFNZU19DT01fVU5ERUZfRjEAU09OR19QT1NJVElPTgBTT05HX05VTUJFUgBTWVNfQ09NX1VOREVGX0Y0AFNZU19DT01fVU5ERUZfRjUAVFVORV9SRVFVRVNUAFNZU19FWF9FTkQAVElNSU5HX0NMT0NLAFNUQVJUX1NFUVVFTkNFAENPTlRJTlVFX1NFUVVFTkNFAFNUT1BfU0VRVUVOQ0UAU1lTX0NPTV9VTkRFRl9GRABBQ1RJVkVfU0VOU0lORwBNRVRBX0VWRU5UAE1JREkgbm90ZSBudW1iZXIgaXMgb3V0IG9mIHJhbmdlLiBtaWRpTm90ZTolZCAAbWlkaU5vdGUgPD0gTUFYX01JRElfTk9URQBzdGF0aWMgTUlESUV2ZW50IE1JRElFdmVudDo6bWFrZU5vdGVPZmZFdmVudCh1aW50OF90LCB1aW50OF90LCB1aW50NjRfdCkAbWFrZU5vdGVPZmZFdmVudADima8A4pmtAC9Vc2Vycy90YWVtaW5jaG8vQmFuZExhYi9iYW5kbGFiLWF1ZGlvLWVuZ2luZS9lbmdpbmUvTXVzaWNVdGlscy5jcHAAdGlja3NQZXJRdWFydGVyOiVkIAB0aWNrc1BlclF1YXJ0ZXIgPiAwAHN0YXRpYyBkb3VibGUgTXVzaWNVdGlsczo6dGlja3NUb1NlY3MoZG91YmxlLCB1aW50MzJfdCwgZG91YmxlKQB0aWNrc1RvU2VjcwAgIABudW1DaGFubmVscyA9PSBOVU1fQ0hBTk5FTFMAL1VzZXJzL3RhZW1pbmNoby9CYW5kTGFiL2JhbmRsYWItYXVkaW8tZW5naW5lL2VuZ2luZS9NSURJU3ludGguY3BwAHZpcnR1YWwgdm9pZCBNSURJU3ludGg6OmluaXQoaW50LCBpbnQpAHNhbXBsZVJhdGUgPj0gMTAwMCAmJiBzYW1wbGVSYXRlIDw9IDEwMDAwMABkc3RCdWYgIT0gbnVsbHB0cgB2aXJ0dWFsIHZvaWQgTUlESVN5bnRoOjpnZW5lcmF0ZShmbG9hdCAqLCBpbnQpAGdlbmVyYXRlAG51bUZyYW1lcyA+IDAAIAAobXNiICYgMHg4MCkgPT0gMCAmJiAobHNiICYgMHg4MCkgPT0gMAB1aW50MTZfdCBieXRlUGFpclRvU2hvcnQodWludDhfdCwgdWludDhfdCkAYnl0ZVBhaXJUb1Nob3J0ADlNSURJU3ludGgALQBSZWxlYXNlIHRpbWUgbXVzdCBiZSBhIHBvc2l0aXZlIG51bWJlciBvciAwIAB0aW1lID49IDAAL1VzZXJzL3RhZW1pbmNoby9CYW5kTGFiL2JhbmRsYWItYXVkaW8tZW5naW5lL2VuZ2luZS9WQVN5bnRoLmNwcAB2b2lkIEFEU1I6OnNldFJlbGVhc2VUaW1lKGNvbnN0IGZsb2F0ICYpAHNldFJlbGVhc2VUaW1lAERlY2F5IHRpbWUgbXVzdCBiZSBhIHBvc2l0aXZlIG51bWJlciBvciAwIAB2b2lkIEFEU1I6OnNldERlY2F5VGltZShjb25zdCBmbG9hdCAmKQBzZXREZWNheVRpbWUAQXR0YWNrIHRpbWUgbXVzdCBiZSBhIHBvc2l0aXZlIG51bWJlciBvciAwIAB2b2lkIEFEU1I6OnNldEF0dGFja1RpbWUoY29uc3QgZmxvYXQgJikAc2V0QXR0YWNrVGltZQBzdGVyZW8gcGFyYW1ldGVyIG91dCBvZiByYW5nZSwgbXVzdCBiZSB3aXRoaW4gWzAsIDFdIHJhbmdlIABzdGVyZW8gPj0gMCAmJiBzdGVyZW8gPD0xAHZvaWQgTXVsdGlPU0M6OnNldFN0ZXJlbyhjb25zdCBmbG9hdCAmKQBzZXRTdGVyZW8AYWxsb2NhdG9yPFQ+OjphbGxvY2F0ZShzaXplX3QgbikgJ24nIGV4Y2VlZHMgbWF4aW11bSBzdXBwb3J0ZWQgc2l6ZQBBdWRpb0VuZ2luZTogIyMjIyBXQVJOSU5HOiBNSURJU2FtcGxlU3ludGg6OnByb2Nlc3NOb3RlT24uIE5vIGZyZWUgdm9pY2UgYXZhaWxhYmxlISEKAG9zYzFOdW1Pc2MAYW1wRW52UmVsZWFzZVRpbWUAbW9kRW52U3VzdGFpbkxldmVsAE11bHRpVm9pY2VPU0Mgb25seSBzdXBwb3J0cyBtb25vIG9yIHN0ZXJlbyAAbnVtQ2ggPT0gMSB8fCBudW1DaCA9PSAyAHZvaWQgTXVsdGlPU0M6OmluaXQoY29uc3QgZmxvYXQgJiwgaW50KQBOU3QzX18yMjBfX3NoYXJlZF9wdHJfZW1wbGFjZUkxNVNtb290aFBhcmFtZXRlck5TXzlhbGxvY2F0b3JJUzFfRUVFRQAyME1vb2dMYWRkZXJGaWx0ZXJfRXh0AE5TdDNfXzIyMF9fc2hhcmVkX3B0cl9lbXBsYWNlSTEyVkFTeW50aFZvaWNlTlNfOWFsbG9jYXRvcklTMV9FRUVFAE5TdDNfXzIyMF9fc2hhcmVkX3B0cl9lbXBsYWNlSTIzUGFyYW1ldGVyQ3VydmVDb252ZXJ0ZXJOU185YWxsb2NhdG9ySVMxX0VFRUUATlN0M19fMjIwX19zaGFyZWRfcHRyX2VtcGxhY2VJOUZJTFRQYXJhbU5TXzlhbGxvY2F0b3JJUzFfRUVFRQBOU3QzX18yMjBfX3NoYXJlZF9wdHJfZW1wbGFjZUkxMlZBU3ludGhQYXJhbU5TXzlhbGxvY2F0b3JJUzFfRUVFRQBOU3QzX18yMjBfX3NoYXJlZF9wdHJfZW1wbGFjZUk4TEZPUGFyYW1OU185YWxsb2NhdG9ySVMxX0VFRUUAWk4xM011bHRpT1NDUGFyYW1DMUV2RVVsUktmRV8ATlN0M19fMjEwX19mdW5jdGlvbjZfX2Z1bmNJWk4xM011bHRpT1NDUGFyYW1DMUV2RVVsUktmRV9OU185YWxsb2NhdG9ySVM1X0VFRnZmRUVFAE5TdDNfXzIxMF9fZnVuY3Rpb242X19iYXNlSUZ2ZkVFRQBaTjEzTXVsdGlPU0NQYXJhbUMxRXZFVWxSS2lFMF8ATlN0M19fMjEwX19mdW5jdGlvbjZfX2Z1bmNJWk4xM011bHRpT1NDUGFyYW1DMUV2RVVsUktpRTBfTlNfOWFsbG9jYXRvcklTNV9FRUZ2aUVFRQBOU3QzX18yMTBfX2Z1bmN0aW9uNl9fYmFzZUlGdmlFRUUAWk4xM011bHRpT1NDUGFyYW1DMUV2RVVsUktpRV8ATlN0M19fMjEwX19mdW5jdGlvbjZfX2Z1bmNJWk4xM011bHRpT1NDUGFyYW1DMUV2RVVsUktpRV9OU185YWxsb2NhdG9ySVM1X0VFRnZpRUVFAE5TdDNfXzIyMF9fc2hhcmVkX3B0cl9lbXBsYWNlSTEzTXVsdGlPU0NQYXJhbU5TXzlhbGxvY2F0b3JJUzFfRUVFRQA3VkFTeW50aAAxLzEAMS8yADEvNAAxLzgAMS8xNkQAMS8zMkQAMS8xNlQARmlsdGVyMSBDdXRvZmYARmlsdGVyMiBDdXRvZmYAQWxsIEZpbHRlciBDdXRvZmZzAEZpbHRlcjEgUmVzb25hbmNlAEZpbHRlcjIgUmVzb25hbmNlAEFsbCBGaWx0ZXIgUmVzb25hbmNlcwBPc2MxIFBpdGNoAE9zYzIgUGl0Y2gAT3NjMyBQaXRjaABBbGwgT3NjIFBpdGNoZXMAT3NjMSBHYWluAE9zYzIgR2FpbgBPc2MzIEdhaW4AQWxsIE9zYyBHYWlucwBMRk8gUmF0ZQBMRk8gR2FpbgBPc2MxIFBhbgBPc2MyIFBhbgBPc2MzIFBhbgBBbGwgT3NjIFBhbnMAU3F1YXJlAE5vaXNlAExvd3Bhc3MAQnlwYXNzAFNlcmllcwBNb2R1bGF0aW9uIFdoZWVsIChNSURJIENDIDEpAE1JREkgQ0MgMgBNSURJIENDIDMATUlESSBDQyA0AE1JREkgQ0MgNQBDaGFubmVsIFZvbHVtZSAoTUlESSBDQyA3KQBNSURJIENDIDgATUlESSBDQyA5AFBhbiAoTUlESSBDQyAxMCkARXhwcmVzc2lvbiBDb250cm9sbGVyIChNSURJIENDIDExKQBNSURJIENDIDEyAE1JREkgQ0MgMTMATUlESSBDQyAxNABNSURJIENDIDE1AE1JREkgQ0MgMTYATUlESSBDQyAxNwBNSURJIENDIDE4AE1JREkgQ0MgMTkATUlESSBDQyAyMABNSURJIENDIDIxAE1JREkgQ0MgMjIATUlESSBDQyAyMwBNSURJIENDIDI0AE1JREkgQ0MgMjUATUlESSBDQyAyNgBNSURJIENDIDI3AE1JREkgQ0MgMjgATUlESSBDQyAyOQBNSURJIENDIDMwAE1JREkgQ0MgMzEATUlESSBDQyAzMgBNSURJIENDIDMzAE1JREkgQ0MgMzQATUlESSBDQyAzNQBNSURJIENDIDM2AE1JREkgQ0MgMzcATUlESSBDQyAzOQBNSURJIENDIDQxAE1JREkgQ0MgNDIATUlESSBDQyA0MwBNSURJIENDIDQ0AE1JREkgQ0MgNDUATUlESSBDQyA0NgBNSURJIENDIDQ3AE1JREkgQ0MgNDgATUlESSBDQyA0OQBNSURJIENDIDUwAE1JREkgQ0MgNTEATUlESSBDQyA1MgBNSURJIENDIDUzAE1JREkgQ0MgNTQATUlESSBDQyA1NQBNSURJIENDIDU2AE1JREkgQ0MgNTcATUlESSBDQyA1OABNSURJIENDIDU5AE1JREkgQ0MgNjAATUlESSBDQyA2MQBNSURJIENDIDYyAE1JREkgQ0MgNjMATUlESSBDQyA2NQBNSURJIENDIDY2AE1JREkgQ0MgNjcATUlESSBDQyA2OABNSURJIENDIDY5AE1JREkgQ0MgNzAATUlESSBDQyA3MQBNSURJIENDIDcyAE1JREkgQ0MgNzMATUlESSBDQyA3NABNSURJIENDIDc1AE1JREkgQ0MgNzYATUlESSBDQyA3NwBNSURJIENDIDc4AE1JREkgQ0MgNzkATUlESSBDQyA4MABNSURJIENDIDgxAE1JREkgQ0MgODIATUlESSBDQyA4MwBNSURJIENDIDg0AE1JREkgQ0MgODUATUlESSBDQyA4NgBNSURJIENDIDg3AE1JREkgQ0MgODgATUlESSBDQyA4OQBNSURJIENDIDkwAE1JREkgQ0MgOTEATUlESSBDQyA5MgBNSURJIENDIDkzAE1JREkgQ0MgOTQATUlESSBDQyA5NQBNSURJIENDIDEwMgBNSURJIENDIDEwMwBNSURJIENDIDEwNABNSURJIENDIDEwNQBNSURJIENDIDEwNgBNSURJIENDIDEwNwBNSURJIENDIDEwOABNSURJIENDIDEwOQBNSURJIENDIDExMABNSURJIENDIDExMQBNSURJIENDIDExMgBNSURJIENDIDExMwBNSURJIENDIDExNABNSURJIENDIDExNQBNSURJIENDIDExNgBNSURJIENDIDExNwBNSURJIENDIDExOABNSURJIENDIDExOQBvc2MxR2FpbgBvc2MxUGFuAG9zYzFEZXR1bmUAb3NjMVN0ZXJlbwBvc2MxRHV0eUN5Y2xlAG9zYzFGaWx0ZXJTcGxpdHRlcgBvc2MyR2FpbgBvc2MyUGFuAG9zYzJEZXR1bmUAb3NjMlN0ZXJlbwBvc2MyRHV0eUN5Y2xlAG9zYzJGaWx0ZXJTcGxpdHRlcgBvc2MzR2FpbgBvc2MzUGFuAG9zYzNEZXR1bmUAb3NjM1N0ZXJlbwBvc2MzRHV0eUN5Y2xlAG9zYzNGaWx0ZXJTcGxpdHRlcgBhbXBFbnZBdHRhY2tUaW1lAGFtcEVudkRlY2F5VGltZQBhbXBFbnZTdXN0YWluTGV2ZWwAZmlsdGVyMUN1dG9mZkZyZXF1ZW5jeQBmaWx0ZXIxUmVzb25hbmNlAGZpbHRlcjFEcml2ZQBmaWx0ZXIxS2V5VHJhY2sAZmlsdGVyMkN1dG9mZkZyZXF1ZW5jeQBmaWx0ZXIyUmVzb25hbmNlAGZpbHRlcjJEcml2ZQBmaWx0ZXIyS2V5VHJhY2sAcG9ydGFtZW50b1RpbWUAbW9kRW52QXR0YWNrVGltZQBtb2RFbnZEZWNheVRpbWUAbW9kRW52UmVsZWFzZVRpbWUAbGZvUmF0ZQBsZm9HYWluAGxmb1BoYXNlAGxmb09mZnNldABtYXgAbWluAFZBU3ludGgATUlESUNvbnRyb2xsZXIAVkFTeW50aFBhcmFtAHNhbXBsZVJhdGUgbXVzdCBiZSBhIHBvc2l0aXZlIG51bWJlciAAQVNTRVJUSU9OIEZBSUxFRDogJXMgCkNPTkRJVElPTjogJXMgCkZJTEU6ICVzIApMSU5FOiAlZCAKRlVOQ1RJT046ICVzAHNhbXBsZVJhdGUgPiAwAC9Vc2Vycy90YWVtaW5jaG8vQmFuZExhYi9iYW5kbGFiLWF1ZGlvLWVuZ2luZS9lbmdpbmUvVkFGaWx0ZXIuY3BwAHZpcnR1YWwgdm9pZCBWQUZpbHRlcjo6aW5pdChjb25zdCBmbG9hdCAmLCBjb25zdCBpbnQgJikAJXMAaW5pdAA4VkFGaWx0ZXIAc2V0RmlsdGVyVHlwZQBNb29nTGFkZGVyRmlsdGVyLCBub3Qgc3VwcG9ydGVkIGZpbHRlciB0eXBlIAB2aXJ0dWFsIHZvaWQgTW9vZ0xhZGRlckZpbHRlcjo6c2V0RmlsdGVyVHlwZShjb25zdCBWQUZpbHRlclR5cGUgJikAdmlydHVhbCB2b2lkIE1vb2dMYWRkZXJGaWx0ZXI6OnByb2Nlc3MoY29uc3QgZmxvYXQgKiwgZmxvYXQgKikAcHJvY2VzcwAxNk1vb2dMYWRkZXJGaWx0ZXIAdm9pZABib29sAHN0ZDo6c3RyaW5nAHN0ZDo6YmFzaWNfc3RyaW5nPHVuc2lnbmVkIGNoYXI+AHN0ZDo6d3N0cmluZwBlbXNjcmlwdGVuOjp2YWwAZW1zY3JpcHRlbjo6bWVtb3J5X3ZpZXc8c2lnbmVkIGNoYXI+AGVtc2NyaXB0ZW46Om1lbW9yeV92aWV3PHVuc2lnbmVkIGNoYXI+AGVtc2NyaXB0ZW46Om1lbW9yeV92aWV3PHNob3J0PgBlbXNjcmlwdGVuOjptZW1vcnlfdmlldzx1bnNpZ25lZCBzaG9ydD4AZW1zY3JpcHRlbjo6bWVtb3J5X3ZpZXc8aW50PgBlbXNjcmlwdGVuOjptZW1vcnlfdmlldzx1bnNpZ25lZCBpbnQ+AGVtc2NyaXB0ZW46Om1lbW9yeV92aWV3PGludDhfdD4AZW1zY3JpcHRlbjo6bWVtb3J5X3ZpZXc8dWludDhfdD4AZW1zY3JpcHRlbjo6bWVtb3J5X3ZpZXc8aW50MTZfdD4AZW1zY3JpcHRlbjo6bWVtb3J5X3ZpZXc8dWludDE2X3Q+AGVtc2NyaXB0ZW46Om1lbW9yeV92aWV3PGludDMyX3Q+AGVtc2NyaXB0ZW46Om1lbW9yeV92aWV3PHVpbnQzMl90PgBlbXNjcmlwdGVuOjptZW1vcnlfdmlldzxsb25nIGRvdWJsZT4ATjEwZW1zY3JpcHRlbjExbWVtb3J5X3ZpZXdJZUVFAGVtc2NyaXB0ZW46Om1lbW9yeV92aWV3PGRvdWJsZT4ATjEwZW1zY3JpcHRlbjExbWVtb3J5X3ZpZXdJZEVFAGVtc2NyaXB0ZW46Om1lbW9yeV92aWV3PGZsb2F0PgBOMTBlbXNjcmlwdGVuMTFtZW1vcnlfdmlld0lmRUUAZW1zY3JpcHRlbjo6bWVtb3J5X3ZpZXc8dW5zaWduZWQgbG9uZz4ATjEwZW1zY3JpcHRlbjExbWVtb3J5X3ZpZXdJbUVFAGVtc2NyaXB0ZW46Om1lbW9yeV92aWV3PGxvbmc+AE4xMGVtc2NyaXB0ZW4xMW1lbW9yeV92aWV3SWxFRQBOMTBlbXNjcmlwdGVuMTFtZW1vcnlfdmlld0lqRUUATjEwZW1zY3JpcHRlbjExbWVtb3J5X3ZpZXdJaUVFAE4xMGVtc2NyaXB0ZW4xMW1lbW9yeV92aWV3SXRFRQBOMTBlbXNjcmlwdGVuMTFtZW1vcnlfdmlld0lzRUUATjEwZW1zY3JpcHRlbjExbWVtb3J5X3ZpZXdJaEVFAE4xMGVtc2NyaXB0ZW4xMW1lbW9yeV92aWV3SWFFRQBlbXNjcmlwdGVuOjptZW1vcnlfdmlldzxjaGFyPgBOMTBlbXNjcmlwdGVuMTFtZW1vcnlfdmlld0ljRUUATjEwZW1zY3JpcHRlbjN2YWxFAE5TdDNfXzIxMmJhc2ljX3N0cmluZ0l3TlNfMTFjaGFyX3RyYWl0c0l3RUVOU185YWxsb2NhdG9ySXdFRUVFAE5TdDNfXzIxMmJhc2ljX3N0cmluZ0loTlNfMTFjaGFyX3RyYWl0c0loRUVOU185YWxsb2NhdG9ySWhFRUVFAGRvdWJsZQBmbG9hdAB1bnNpZ25lZCBsb25nAGxvbmcAdW5zaWduZWQgaW50AGludAB1bnNpZ25lZCBzaG9ydABzaG9ydAB1bnNpZ25lZCBjaGFyAHNpZ25lZCBjaGFyAGNoYXIAaW5maW5pdHkA/////////////////////////////////////////////////////////////////wABAgMEBQYHCAn/////////CgsMDQ4PEBESExQVFhcYGRobHB0eHyAhIiP///////8KCwwNDg8QERITFBUWFxgZGhscHR4fICEiI/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////8AAQIEBwMGBQARAAoAERERAAAAAAUAAAAAAAAJAAAAAAsAQYOzAQshEQAPChEREQMKBwABEwkLCwAACQYLAAALAAYRAAAAERERAEG0swELAQsAQb2zAQsYEQAKChEREQAKAAACAAkLAAAACQALAAALAEHuswELAQwAQfqzAQsVDAAAAAAMAAAAAAkMAAAAAAAMAAAMAEGotAELAQ4AQbS0AQsVDQAAAAQNAAAAAAkOAAAAAAAOAAAOAEHitAELARAAQe60AQseDwAAAAAPAAAAAAkQAAAAAAAQAAAQAAASAAAAEhISAEGltQELDhIAAAASEhIAAAAAAAAJAEHWtQELAQsAQeK1AQsVCgAAAAAKAAAAAAkLAAAAAAALAAALAEGQtgELAQwAQZy2AQvnKQwAAAAADAAAAAAJDAAAAAAADAAADAAALSsgICAwWDB4AChudWxsKQAtMFgrMFggMFgtMHgrMHggMHgAaW5mAElORgBuYW4ATkFOADAxMjM0NTY3ODlBQkNERUYuAFQhIhkNAQIDEUscDBAECx0SHidobm9wcWIgBQYPExQVGggWBygkFxgJCg4bHyUjg4J9JiorPD0+P0NHSk1YWVpbXF1eX2BhY2RlZmdpamtscnN0eXp7fABJbGxlZ2FsIGJ5dGUgc2VxdWVuY2UARG9tYWluIGVycm9yAFJlc3VsdCBub3QgcmVwcmVzZW50YWJsZQBOb3QgYSB0dHkAUGVybWlzc2lvbiBkZW5pZWQAT3BlcmF0aW9uIG5vdCBwZXJtaXR0ZWQATm8gc3VjaCBmaWxlIG9yIGRpcmVjdG9yeQBObyBzdWNoIHByb2Nlc3MARmlsZSBleGlzdHMAVmFsdWUgdG9vIGxhcmdlIGZvciBkYXRhIHR5cGUATm8gc3BhY2UgbGVmdCBvbiBkZXZpY2UAT3V0IG9mIG1lbW9yeQBSZXNvdXJjZSBidXN5AEludGVycnVwdGVkIHN5c3RlbSBjYWxsAFJlc291cmNlIHRlbXBvcmFyaWx5IHVuYXZhaWxhYmxlAEludmFsaWQgc2VlawBDcm9zcy1kZXZpY2UgbGluawBSZWFkLW9ubHkgZmlsZSBzeXN0ZW0ARGlyZWN0b3J5IG5vdCBlbXB0eQBDb25uZWN0aW9uIHJlc2V0IGJ5IHBlZXIAT3BlcmF0aW9uIHRpbWVkIG91dABDb25uZWN0aW9uIHJlZnVzZWQASG9zdCBpcyBkb3duAEhvc3QgaXMgdW5yZWFjaGFibGUAQWRkcmVzcyBpbiB1c2UAQnJva2VuIHBpcGUASS9PIGVycm9yAE5vIHN1Y2ggZGV2aWNlIG9yIGFkZHJlc3MAQmxvY2sgZGV2aWNlIHJlcXVpcmVkAE5vIHN1Y2ggZGV2aWNlAE5vdCBhIGRpcmVjdG9yeQBJcyBhIGRpcmVjdG9yeQBUZXh0IGZpbGUgYnVzeQBFeGVjIGZvcm1hdCBlcnJvcgBJbnZhbGlkIGFyZ3VtZW50AEFyZ3VtZW50IGxpc3QgdG9vIGxvbmcAU3ltYm9saWMgbGluayBsb29wAEZpbGVuYW1lIHRvbyBsb25nAFRvbyBtYW55IG9wZW4gZmlsZXMgaW4gc3lzdGVtAE5vIGZpbGUgZGVzY3JpcHRvcnMgYXZhaWxhYmxlAEJhZCBmaWxlIGRlc2NyaXB0b3IATm8gY2hpbGQgcHJvY2VzcwBCYWQgYWRkcmVzcwBGaWxlIHRvbyBsYXJnZQBUb28gbWFueSBsaW5rcwBObyBsb2NrcyBhdmFpbGFibGUAUmVzb3VyY2UgZGVhZGxvY2sgd291bGQgb2NjdXIAU3RhdGUgbm90IHJlY292ZXJhYmxlAFByZXZpb3VzIG93bmVyIGRpZWQAT3BlcmF0aW9uIGNhbmNlbGVkAEZ1bmN0aW9uIG5vdCBpbXBsZW1lbnRlZABObyBtZXNzYWdlIG9mIGRlc2lyZWQgdHlwZQBJZGVudGlmaWVyIHJlbW92ZWQARGV2aWNlIG5vdCBhIHN0cmVhbQBObyBkYXRhIGF2YWlsYWJsZQBEZXZpY2UgdGltZW91dABPdXQgb2Ygc3RyZWFtcyByZXNvdXJjZXMATGluayBoYXMgYmVlbiBzZXZlcmVkAFByb3RvY29sIGVycm9yAEJhZCBtZXNzYWdlAEZpbGUgZGVzY3JpcHRvciBpbiBiYWQgc3RhdGUATm90IGEgc29ja2V0AERlc3RpbmF0aW9uIGFkZHJlc3MgcmVxdWlyZWQATWVzc2FnZSB0b28gbGFyZ2UAUHJvdG9jb2wgd3JvbmcgdHlwZSBmb3Igc29ja2V0AFByb3RvY29sIG5vdCBhdmFpbGFibGUAUHJvdG9jb2wgbm90IHN1cHBvcnRlZABTb2NrZXQgdHlwZSBub3Qgc3VwcG9ydGVkAE5vdCBzdXBwb3J0ZWQAUHJvdG9jb2wgZmFtaWx5IG5vdCBzdXBwb3J0ZWQAQWRkcmVzcyBmYW1pbHkgbm90IHN1cHBvcnRlZCBieSBwcm90b2NvbABBZGRyZXNzIG5vdCBhdmFpbGFibGUATmV0d29yayBpcyBkb3duAE5ldHdvcmsgdW5yZWFjaGFibGUAQ29ubmVjdGlvbiByZXNldCBieSBuZXR3b3JrAENvbm5lY3Rpb24gYWJvcnRlZABObyBidWZmZXIgc3BhY2UgYXZhaWxhYmxlAFNvY2tldCBpcyBjb25uZWN0ZWQAU29ja2V0IG5vdCBjb25uZWN0ZWQAQ2Fubm90IHNlbmQgYWZ0ZXIgc29ja2V0IHNodXRkb3duAE9wZXJhdGlvbiBhbHJlYWR5IGluIHByb2dyZXNzAE9wZXJhdGlvbiBpbiBwcm9ncmVzcwBTdGFsZSBmaWxlIGhhbmRsZQBSZW1vdGUgSS9PIGVycm9yAFF1b3RhIGV4Y2VlZGVkAE5vIG1lZGl1bSBmb3VuZABXcm9uZyBtZWRpdW0gdHlwZQBObyBlcnJvciBpbmZvcm1hdGlvbgAATENfQUxMAExDX0NUWVBFAAAAAExDX05VTUVSSUMAAExDX1RJTUUAAAAAAExDX0NPTExBVEUAAExDX01PTkVUQVJZAExDX01FU1NBR0VTAExBTkcAQy5VVEYtOABQT1NJWABNVVNMX0xPQ1BBVEgATlN0M19fMjhpb3NfYmFzZUUATlN0M19fMjliYXNpY19pb3NJY05TXzExY2hhcl90cmFpdHNJY0VFRUUATlN0M19fMjE1YmFzaWNfc3RyZWFtYnVmSWNOU18xMWNoYXJfdHJhaXRzSWNFRUVFAE5TdDNfXzIxM2Jhc2ljX2lzdHJlYW1JY05TXzExY2hhcl90cmFpdHNJY0VFRUUATlN0M19fMjEzYmFzaWNfb3N0cmVhbUljTlNfMTFjaGFyX3RyYWl0c0ljRUVFRQBOU3QzX18yMTRiYXNpY19pb3N0cmVhbUljTlNfMTFjaGFyX3RyYWl0c0ljRUVFRQBOU3QzX18yN2NvbGxhdGVJY0VFAE5TdDNfXzI2bG9jYWxlNWZhY2V0RQBOU3QzX18yN2NvbGxhdGVJd0VFADAxMjM0NTY3ODlhYmNkZWZBQkNERUZ4WCstcFBpSW5OACVwAEMATlN0M19fMjdudW1fZ2V0SWNOU18xOWlzdHJlYW1idWZfaXRlcmF0b3JJY05TXzExY2hhcl90cmFpdHNJY0VFRUVFRQBOU3QzX18yOV9fbnVtX2dldEljRUUATlN0M19fMjE0X19udW1fZ2V0X2Jhc2VFAE5TdDNfXzI3bnVtX2dldEl3TlNfMTlpc3RyZWFtYnVmX2l0ZXJhdG9ySXdOU18xMWNoYXJfdHJhaXRzSXdFRUVFRUUATlN0M19fMjlfX251bV9nZXRJd0VFACVwAAAAAEwAbGwAJQAAAAAAbABOU3QzX18yN251bV9wdXRJY05TXzE5b3N0cmVhbWJ1Zl9pdGVyYXRvckljTlNfMTFjaGFyX3RyYWl0c0ljRUVFRUVFAE5TdDNfXzI5X19udW1fcHV0SWNFRQBOU3QzX18yMTRfX251bV9wdXRfYmFzZUUATlN0M19fMjdudW1fcHV0SXdOU18xOW9zdHJlYW1idWZfaXRlcmF0b3JJd05TXzExY2hhcl90cmFpdHNJd0VFRUVFRQBOU3QzX18yOV9fbnVtX3B1dEl3RUUAJUg6JU06JVMAJW0vJWQvJXkAJUk6JU06JVMgJXAAJWEgJWIgJWQgJUg6JU06JVMgJVkAQU0AUE0ASmFudWFyeQBGZWJydWFyeQBNYXJjaABBcHJpbABNYXkASnVuZQBKdWx5AEF1Z3VzdABTZXB0ZW1iZXIAT2N0b2JlcgBOb3ZlbWJlcgBEZWNlbWJlcgBKYW4ARmViAE1hcgBBcHIASnVuAEp1bABBdWcAU2VwAE9jdABOb3YARGVjAFN1bmRheQBNb25kYXkAVHVlc2RheQBXZWRuZXNkYXkAVGh1cnNkYXkARnJpZGF5AFNhdHVyZGF5AFN1bgBNb24AVHVlAFdlZABUaHUARnJpAFNhdAAlbS8lZC8leSVZLSVtLSVkJUk6JU06JVMgJXAlSDolTSVIOiVNOiVTJUg6JU06JVNOU3QzX18yOHRpbWVfZ2V0SWNOU18xOWlzdHJlYW1idWZfaXRlcmF0b3JJY05TXzExY2hhcl90cmFpdHNJY0VFRUVFRQBOU3QzX18yMjBfX3RpbWVfZ2V0X2Nfc3RvcmFnZUljRUUATlN0M19fMjl0aW1lX2Jhc2VFAE5TdDNfXzI4dGltZV9nZXRJd05TXzE5aXN0cmVhbWJ1Zl9pdGVyYXRvckl3TlNfMTFjaGFyX3RyYWl0c0l3RUVFRUVFAE5TdDNfXzIyMF9fdGltZV9nZXRfY19zdG9yYWdlSXdFRQBOU3QzX18yOHRpbWVfcHV0SWNOU18xOW9zdHJlYW1idWZfaXRlcmF0b3JJY05TXzExY2hhcl90cmFpdHNJY0VFRUVFRQBOU3QzX18yMTBfX3RpbWVfcHV0RQBOU3QzX18yOHRpbWVfcHV0SXdOU18xOW9zdHJlYW1idWZfaXRlcmF0b3JJd05TXzExY2hhcl90cmFpdHNJd0VFRUVFRQBOU3QzX18yMTBtb25leXB1bmN0SWNMYjBFRUUATlN0M19fMjEwbW9uZXlfYmFzZUUATlN0M19fMjEwbW9uZXlwdW5jdEljTGIxRUVFAE5TdDNfXzIxMG1vbmV5cHVuY3RJd0xiMEVFRQBOU3QzX18yMTBtb25leXB1bmN0SXdMYjFFRUUAMDEyMzQ1Njc4OQAlTGYATlN0M19fMjltb25leV9nZXRJY05TXzE5aXN0cmVhbWJ1Zl9pdGVyYXRvckljTlNfMTFjaGFyX3RyYWl0c0ljRUVFRUVFAE5TdDNfXzIxMV9fbW9uZXlfZ2V0SWNFRQAwMTIzNDU2Nzg5AE5TdDNfXzI5bW9uZXlfZ2V0SXdOU18xOWlzdHJlYW1idWZfaXRlcmF0b3JJd05TXzExY2hhcl90cmFpdHNJd0VFRUVFRQBOU3QzX18yMTFfX21vbmV5X2dldEl3RUUAJS4wTGYATlN0M19fMjltb25leV9wdXRJY05TXzE5b3N0cmVhbWJ1Zl9pdGVyYXRvckljTlNfMTFjaGFyX3RyYWl0c0ljRUVFRUVFAE5TdDNfXzIxMV9fbW9uZXlfcHV0SWNFRQBOU3QzX18yOW1vbmV5X3B1dEl3TlNfMTlvc3RyZWFtYnVmX2l0ZXJhdG9ySXdOU18xMWNoYXJfdHJhaXRzSXdFRUVFRUUATlN0M19fMjExX19tb25leV9wdXRJd0VFAE5TdDNfXzI4bWVzc2FnZXNJY0VFAE5TdDNfXzIxM21lc3NhZ2VzX2Jhc2VFAE5TdDNfXzIxN19fd2lkZW5fZnJvbV91dGY4SUxqMzJFRUUATlN0M19fMjdjb2RlY3Z0SURpYzExX19tYnN0YXRlX3RFRQBOU3QzX18yMTJjb2RlY3Z0X2Jhc2VFAE5TdDNfXzIxNl9fbmFycm93X3RvX3V0ZjhJTGozMkVFRQBOU3QzX18yOG1lc3NhZ2VzSXdFRQBOU3QzX18yN2NvZGVjdnRJY2MxMV9fbWJzdGF0ZV90RUUATlN0M19fMjdjb2RlY3Z0SXdjMTFfX21ic3RhdGVfdEVFAE5TdDNfXzI3Y29kZWN2dElEc2MxMV9fbWJzdGF0ZV90RUUATlN0M19fMjZsb2NhbGU1X19pbXBFAE5TdDNfXzI1Y3R5cGVJY0VFAE5TdDNfXzIxMGN0eXBlX2Jhc2VFAE5TdDNfXzI1Y3R5cGVJd0VFAGZhbHNlAHRydWUATlN0M19fMjhudW1wdW5jdEljRUUATlN0M19fMjhudW1wdW5jdEl3RUUATlN0M19fMjE0X19zaGFyZWRfY291bnRFAE5TdDNfXzIxOV9fc2hhcmVkX3dlYWtfY291bnRFAHN0b2kAOiBubyBjb252ZXJzaW9uACVzCgA6IG91dCBvZiByYW5nZQBzdG9mACVkACVmAHRlcm1pbmF0aW5nIHdpdGggJXMgZXhjZXB0aW9uIG9mIHR5cGUgJXM6ICVzAHRlcm1pbmF0aW5nIHdpdGggJXMgZXhjZXB0aW9uIG9mIHR5cGUgJXMAdGVybWluYXRpbmcgd2l0aCAlcyBmb3JlaWduIGV4Y2VwdGlvbgB0ZXJtaW5hdGluZwB1bmNhdWdodABTdDlleGNlcHRpb24ATjEwX19jeHhhYml2MTE2X19zaGltX3R5cGVfaW5mb0UAU3Q5dHlwZV9pbmZvAE4xMF9fY3h4YWJpdjEyMF9fc2lfY2xhc3NfdHlwZV9pbmZvRQBOMTBfX2N4eGFiaXYxMTdfX2NsYXNzX3R5cGVfaW5mb0UAcHRocmVhZF9vbmNlIGZhaWx1cmUgaW4gX19jeGFfZ2V0X2dsb2JhbHNfZmFzdCgpAGNhbm5vdCBjcmVhdGUgcHRocmVhZCBrZXkgZm9yIF9fY3hhX2dldF9nbG9iYWxzKCkAY2Fubm90IHplcm8gb3V0IHRocmVhZCB2YWx1ZSBmb3IgX19jeGFfZ2V0X2dsb2JhbHMoKQB0ZXJtaW5hdGVfaGFuZGxlciB1bmV4cGVjdGVkbHkgcmV0dXJuZWQAU3QxMWxvZ2ljX2Vycm9yAFN0MTNydW50aW1lX2Vycm9yAFN0MTJsZW5ndGhfZXJyb3IATjEwX19jeHhhYml2MTE5X19wb2ludGVyX3R5cGVfaW5mb0UATjEwX19jeHhhYml2MTE3X19wYmFzZV90eXBlX2luZm9FAE4xMF9fY3h4YWJpdjEyM19fZnVuZGFtZW50YWxfdHlwZV9pbmZvRQB2AERuAGIAYwBoAGEAcwB0AGkAagBtAGYAZABOMTBfX2N4eGFiaXYxMjFfX3ZtaV9jbGFzc190eXBlX2luZm9F';
  var asmjsCodeFile = '';

  if (typeof Module['locateFile'] === 'function') {
    if (!isDataURI(wasmTextFile)) {
      wasmTextFile = Module['locateFile'](wasmTextFile);
    }
    if (!isDataURI(wasmBinaryFile)) {
      wasmBinaryFile = Module['locateFile'](wasmBinaryFile);
    }
    if (!isDataURI(asmjsCodeFile)) {
      asmjsCodeFile = Module['locateFile'](asmjsCodeFile);
    }
  }

  // utilities

  var wasmPageSize = 64*1024;

  var info = {
    'global': null,
    'env': null,
    'asm2wasm': asm2wasmImports,
    'parent': Module // Module inside wasm-js.cpp refers to wasm-js.cpp; this allows access to the outside program.
  };

  var exports = null;


  function mergeMemory(newBuffer) {
    // The wasm instance creates its memory. But static init code might have written to
    // buffer already, including the mem init file, and we must copy it over in a proper merge.
    // TODO: avoid this copy, by avoiding such static init writes
    // TODO: in shorter term, just copy up to the last static init write
    var oldBuffer = Module['buffer'];
    if (newBuffer.byteLength < oldBuffer.byteLength) {
      err('the new buffer in mergeMemory is smaller than the previous one. in native wasm, we should grow memory here');
    }
    var oldView = new Int8Array(oldBuffer);
    var newView = new Int8Array(newBuffer);


    newView.set(oldView);
    updateGlobalBuffer(newBuffer);
    updateGlobalBufferViews();
  }

  function fixImports(imports) {
    return imports;
  }

  function getBinary() {
    try {
      if (Module['wasmBinary']) {
        return new Uint8Array(Module['wasmBinary']);
      }
      var binary = tryParseAsDataURI(wasmBinaryFile);
      if (binary) {
        return binary;
      }
      if (Module['readBinary']) {
        return Module['readBinary'](wasmBinaryFile);
      } else {
        throw "on the web, we need the wasm binary to be preloaded and set on Module['wasmBinary']. emcc.py will do that for you when generating HTML (but not JS)";
      }
    }
    catch (err) {
      abort(err);
    }
  }

  function getBinaryPromise() {
    // if we don't have the binary yet, and have the Fetch api, use that
    // in some environments, like Electron's render process, Fetch api may be present, but have a different context than expected, let's only use it on the Web
    if (!Module['wasmBinary'] && (ENVIRONMENT_IS_WEB || ENVIRONMENT_IS_WORKER) && typeof fetch === 'function') {
      return fetch(wasmBinaryFile, { credentials: 'same-origin' }).then(function(response) {
        if (!response['ok']) {
          throw "failed to load wasm binary file at '" + wasmBinaryFile + "'";
        }
        return response['arrayBuffer']();
      }).catch(function () {
        return getBinary();
      });
    }
    // Otherwise, getBinary should be able to get it synchronously
    return new Promise(function(resolve, reject) {
      resolve(getBinary());
    });
  }

  // do-method functions


  function doNativeWasm(global, env, providedBuffer) {
    if (typeof WebAssembly !== 'object') {
      err('no native wasm support detected');
      return false;
    }
    // prepare memory import
    if (!(Module['wasmMemory'] instanceof WebAssembly.Memory)) {
      err('no native wasm Memory in use');
      return false;
    }
    env['memory'] = Module['wasmMemory'];
    // Load the wasm module and create an instance of using native support in the JS engine.
    info['global'] = {
      'NaN': NaN,
      'Infinity': Infinity
    };
    info['global.Math'] = Math;
    info['env'] = env;
    // handle a generated wasm instance, receiving its exports and
    // performing other necessary setup
    function receiveInstance(instance, module) {
      exports = instance.exports;
      if (exports.memory) mergeMemory(exports.memory);
      Module['asm'] = exports;
      Module["usingWasm"] = true;
      removeRunDependency('wasm-instantiate');
    }
    addRunDependency('wasm-instantiate');

    // User shell pages can write their own Module.instantiateWasm = function(imports, successCallback) callback
    // to manually instantiate the Wasm module themselves. This allows pages to run the instantiation parallel
    // to any other async startup actions they are performing.
    if (Module['instantiateWasm']) {
      try {
        return Module['instantiateWasm'](info, receiveInstance);
      } catch(e) {
        err('Module.instantiateWasm callback failed with error: ' + e);
        return false;
      }
    }

    var instance;
    try {
      instance = new WebAssembly.Instance(new WebAssembly.Module(getBinary()), info)
    } catch (e) {
      err('failed to compile wasm module: ' + e);
      if (e.toString().indexOf('imported Memory with incompatible size') >= 0) {
        err('Memory size incompatibility issues may be due to changing TOTAL_MEMORY at runtime to something too large. Use ALLOW_MEMORY_GROWTH to allow any size memory (and also make sure not to set TOTAL_MEMORY at runtime to something smaller than it was at compile time).');
      }
      return false;
    }
    receiveInstance(instance);
    return exports;
  }


  // We may have a preloaded value in Module.asm, save it
  Module['asmPreload'] = Module['asm'];

  // Memory growth integration code

  var asmjsReallocBuffer = Module['reallocBuffer'];

  var wasmReallocBuffer = function(size) {
    var PAGE_MULTIPLE = Module["usingWasm"] ? WASM_PAGE_SIZE : ASMJS_PAGE_SIZE; // In wasm, heap size must be a multiple of 64KB. In asm.js, they need to be multiples of 16MB.
    size = alignUp(size, PAGE_MULTIPLE); // round up to wasm page size
    var old = Module['buffer'];
    var oldSize = old.byteLength;
    if (Module["usingWasm"]) {
      // native wasm support
      try {
        var result = Module['wasmMemory'].grow((size - oldSize) / wasmPageSize); // .grow() takes a delta compared to the previous size
        if (result !== (-1 | 0)) {
          // success in native wasm memory growth, get the buffer from the memory
          return Module['buffer'] = Module['wasmMemory'].buffer;
        } else {
          return null;
        }
      } catch(e) {
        return null;
      }
    }
  };

  Module['reallocBuffer'] = function(size) {
    if (finalMethod === 'asmjs') {
      return asmjsReallocBuffer(size);
    } else {
      return wasmReallocBuffer(size);
    }
  };

  // we may try more than one; this is the final one, that worked and we are using
  var finalMethod = '';

  // Provide an "asm.js function" for the application, called to "link" the asm.js module. We instantiate
  // the wasm module at that time, and it receives imports and provides exports and so forth, the app
  // doesn't need to care that it is wasm or olyfilled wasm or asm.js.

  Module['asm'] = function(global, env, providedBuffer) {
    env = fixImports(env);

    // import table
    if (!env['table']) {
      var TABLE_SIZE = Module['wasmTableSize'];
      if (TABLE_SIZE === undefined) TABLE_SIZE = 1024; // works in binaryen interpreter at least
      var MAX_TABLE_SIZE = Module['wasmMaxTableSize'];
      if (typeof WebAssembly === 'object' && typeof WebAssembly.Table === 'function') {
        if (MAX_TABLE_SIZE !== undefined) {
          env['table'] = new WebAssembly.Table({ 'initial': TABLE_SIZE, 'maximum': MAX_TABLE_SIZE, 'element': 'anyfunc' });
        } else {
          env['table'] = new WebAssembly.Table({ 'initial': TABLE_SIZE, element: 'anyfunc' });
        }
      } else {
        env['table'] = new Array(TABLE_SIZE); // works in binaryen interpreter at least
      }
      Module['wasmTable'] = env['table'];
    }

    if (!env['memoryBase']) {
      env['memoryBase'] = Module['STATIC_BASE']; // tell the memory segments where to place themselves
    }
    if (!env['tableBase']) {
      env['tableBase'] = 0; // table starts at 0 by default, in dynamic linking this will change
    }

    // try the methods. each should return the exports if it succeeded

    var exports;
    exports = doNativeWasm(global, env, providedBuffer);

    assert(exports, 'no binaryen method succeeded.');


    return exports;
  };

  var methodHandler = Module['asm']; // note our method handler, as we may modify Module['asm'] later
}

integrateWasmJS();

// === Body ===

var ASM_CONSTS = [];





STATIC_BASE = GLOBAL_BASE;

STATICTOP = STATIC_BASE + 32128;
/* global initializers */  __ATINIT__.push({ func: function() { __GLOBAL__sub_I_VASynthAW_cpp() } }, { func: function() { __GLOBAL__sub_I_AudioEngineCommon_cpp() } }, { func: function() { __GLOBAL__sub_I_DSP_cpp() } }, { func: function() { __GLOBAL__sub_I_MIDIParser_cpp() } }, { func: function() { __GLOBAL__sub_I_MusicUtils_cpp() } }, { func: function() { __GLOBAL__sub_I_VASynth_cpp() } }, { func: function() { __GLOBAL__sub_I_bind_cpp() } });







var STATIC_BUMP = 32128;
Module["STATIC_BASE"] = STATIC_BASE;
Module["STATIC_BUMP"] = STATIC_BUMP;

/* no memory initializer */
var tempDoublePtr = STATICTOP; STATICTOP += 16;

function copyTempFloat(ptr) { // functions, because inlining this code increases code size too much

  HEAP8[tempDoublePtr] = HEAP8[ptr];

  HEAP8[tempDoublePtr+1] = HEAP8[ptr+1];

  HEAP8[tempDoublePtr+2] = HEAP8[ptr+2];

  HEAP8[tempDoublePtr+3] = HEAP8[ptr+3];

}

function copyTempDouble(ptr) {

  HEAP8[tempDoublePtr] = HEAP8[ptr];

  HEAP8[tempDoublePtr+1] = HEAP8[ptr+1];

  HEAP8[tempDoublePtr+2] = HEAP8[ptr+2];

  HEAP8[tempDoublePtr+3] = HEAP8[ptr+3];

  HEAP8[tempDoublePtr+4] = HEAP8[ptr+4];

  HEAP8[tempDoublePtr+5] = HEAP8[ptr+5];

  HEAP8[tempDoublePtr+6] = HEAP8[ptr+6];

  HEAP8[tempDoublePtr+7] = HEAP8[ptr+7];

}

// {{PRE_LIBRARY}}


  function ___assert_fail(condition, filename, line, func) {
      abort('Assertion failed: ' + Pointer_stringify(condition) + ', at: ' + [filename ? Pointer_stringify(filename) : 'unknown filename', line, func ? Pointer_stringify(func) : 'unknown function']);
    }

  function ___cxa_allocate_exception(size) {
      return _malloc(size);
    }


  var EXCEPTIONS={last:0,caught:[],infos:{},deAdjust:function (adjusted) {
        if (!adjusted || EXCEPTIONS.infos[adjusted]) return adjusted;
        for (var key in EXCEPTIONS.infos) {
          var ptr = +key; // the iteration key is a string, and if we throw this, it must be an integer as that is what we look for
          var info = EXCEPTIONS.infos[ptr];
          if (info.adjusted === adjusted) {
            return ptr;
          }
        }
        return adjusted;
      },addRef:function (ptr) {
        if (!ptr) return;
        var info = EXCEPTIONS.infos[ptr];
        info.refcount++;
      },decRef:function (ptr) {
        if (!ptr) return;
        var info = EXCEPTIONS.infos[ptr];
        assert(info.refcount > 0);
        info.refcount--;
        // A rethrown exception can reach refcount 0; it must not be discarded
        // Its next handler will clear the rethrown flag and addRef it, prior to
        // final decRef and destruction here
        if (info.refcount === 0 && !info.rethrown) {
          if (info.destructor) {
            Module['dynCall_vi'](info.destructor, ptr);
          }
          delete EXCEPTIONS.infos[ptr];
          ___cxa_free_exception(ptr);
        }
      },clearRef:function (ptr) {
        if (!ptr) return;
        var info = EXCEPTIONS.infos[ptr];
        info.refcount = 0;
      }};function ___cxa_begin_catch(ptr) {
      var info = EXCEPTIONS.infos[ptr];
      if (info && !info.caught) {
        info.caught = true;
        __ZSt18uncaught_exceptionv.uncaught_exception--;
      }
      if (info) info.rethrown = false;
      EXCEPTIONS.caught.push(ptr);
      EXCEPTIONS.addRef(EXCEPTIONS.deAdjust(ptr));
      return ptr;
    }

  function ___cxa_pure_virtual() {
      ABORT = true;
      throw 'Pure virtual function called!';
    }



  function ___resumeException(ptr) {
      if (!EXCEPTIONS.last) { EXCEPTIONS.last = ptr; }
      throw ptr + " - Exception catching is disabled, this exception cannot be caught. Compile with -s DISABLE_EXCEPTION_CATCHING=0 or DISABLE_EXCEPTION_CATCHING=2 to catch.";
    }function ___cxa_find_matching_catch() {
      var thrown = EXCEPTIONS.last;
      if (!thrown) {
        // just pass through the null ptr
        return ((setTempRet0(0),0)|0);
      }
      var info = EXCEPTIONS.infos[thrown];
      var throwntype = info.type;
      if (!throwntype) {
        // just pass through the thrown ptr
        return ((setTempRet0(0),thrown)|0);
      }
      var typeArray = Array.prototype.slice.call(arguments);

      var pointer = Module['___cxa_is_pointer_type'](throwntype);
      // can_catch receives a **, add indirection
      if (!___cxa_find_matching_catch.buffer) ___cxa_find_matching_catch.buffer = _malloc(4);
      HEAP32[((___cxa_find_matching_catch.buffer)>>2)]=thrown;
      thrown = ___cxa_find_matching_catch.buffer;
      // The different catch blocks are denoted by different types.
      // Due to inheritance, those types may not precisely match the
      // type of the thrown object. Find one which matches, and
      // return the type of the catch block which should be called.
      for (var i = 0; i < typeArray.length; i++) {
        if (typeArray[i] && Module['___cxa_can_catch'](typeArray[i], throwntype, thrown)) {
          thrown = HEAP32[((thrown)>>2)]; // undo indirection
          info.adjusted = thrown;
          return ((setTempRet0(typeArray[i]),thrown)|0);
        }
      }
      // Shouldn't happen unless we have bogus data in typeArray
      // or encounter a type for which emscripten doesn't have suitable
      // typeinfo defined. Best-efforts match just in case.
      thrown = HEAP32[((thrown)>>2)]; // undo indirection
      return ((setTempRet0(throwntype),thrown)|0);
    }function ___cxa_throw(ptr, type, destructor) {
      EXCEPTIONS.infos[ptr] = {
        ptr: ptr,
        adjusted: ptr,
        type: type,
        destructor: destructor,
        refcount: 0,
        caught: false,
        rethrown: false
      };
      EXCEPTIONS.last = ptr;
      if (!("uncaught_exception" in __ZSt18uncaught_exceptionv)) {
        __ZSt18uncaught_exceptionv.uncaught_exception = 1;
      } else {
        __ZSt18uncaught_exceptionv.uncaught_exception++;
      }
      throw ptr + " - Exception catching is disabled, this exception cannot be caught. Compile with -s DISABLE_EXCEPTION_CATCHING=0 or DISABLE_EXCEPTION_CATCHING=2 to catch.";
    }

  function ___cxa_uncaught_exception() {
      return !!__ZSt18uncaught_exceptionv.uncaught_exception;
    }

  function ___gxx_personality_v0() {
    }

  function ___lock() {}


  var ERRNO_CODES={EPERM:1,ENOENT:2,ESRCH:3,EINTR:4,EIO:5,ENXIO:6,E2BIG:7,ENOEXEC:8,EBADF:9,ECHILD:10,EAGAIN:11,EWOULDBLOCK:11,ENOMEM:12,EACCES:13,EFAULT:14,ENOTBLK:15,EBUSY:16,EEXIST:17,EXDEV:18,ENODEV:19,ENOTDIR:20,EISDIR:21,EINVAL:22,ENFILE:23,EMFILE:24,ENOTTY:25,ETXTBSY:26,EFBIG:27,ENOSPC:28,ESPIPE:29,EROFS:30,EMLINK:31,EPIPE:32,EDOM:33,ERANGE:34,ENOMSG:42,EIDRM:43,ECHRNG:44,EL2NSYNC:45,EL3HLT:46,EL3RST:47,ELNRNG:48,EUNATCH:49,ENOCSI:50,EL2HLT:51,EDEADLK:35,ENOLCK:37,EBADE:52,EBADR:53,EXFULL:54,ENOANO:55,EBADRQC:56,EBADSLT:57,EDEADLOCK:35,EBFONT:59,ENOSTR:60,ENODATA:61,ETIME:62,ENOSR:63,ENONET:64,ENOPKG:65,EREMOTE:66,ENOLINK:67,EADV:68,ESRMNT:69,ECOMM:70,EPROTO:71,EMULTIHOP:72,EDOTDOT:73,EBADMSG:74,ENOTUNIQ:76,EBADFD:77,EREMCHG:78,ELIBACC:79,ELIBBAD:80,ELIBSCN:81,ELIBMAX:82,ELIBEXEC:83,ENOSYS:38,ENOTEMPTY:39,ENAMETOOLONG:36,ELOOP:40,EOPNOTSUPP:95,EPFNOSUPPORT:96,ECONNRESET:104,ENOBUFS:105,EAFNOSUPPORT:97,EPROTOTYPE:91,ENOTSOCK:88,ENOPROTOOPT:92,ESHUTDOWN:108,ECONNREFUSED:111,EADDRINUSE:98,ECONNABORTED:103,ENETUNREACH:101,ENETDOWN:100,ETIMEDOUT:110,EHOSTDOWN:112,EHOSTUNREACH:113,EINPROGRESS:115,EALREADY:114,EDESTADDRREQ:89,EMSGSIZE:90,EPROTONOSUPPORT:93,ESOCKTNOSUPPORT:94,EADDRNOTAVAIL:99,ENETRESET:102,EISCONN:106,ENOTCONN:107,ETOOMANYREFS:109,EUSERS:87,EDQUOT:122,ESTALE:116,ENOTSUP:95,ENOMEDIUM:123,EILSEQ:84,EOVERFLOW:75,ECANCELED:125,ENOTRECOVERABLE:131,EOWNERDEAD:130,ESTRPIPE:86};

  function ___setErrNo(value) {
      if (Module['___errno_location']) HEAP32[((Module['___errno_location']())>>2)]=value;
      return value;
    }function ___map_file(pathname, size) {
      ___setErrNo(ERRNO_CODES.EPERM);
      return -1;
    }




  var ERRNO_MESSAGES={0:"Success",1:"Not super-user",2:"No such file or directory",3:"No such process",4:"Interrupted system call",5:"I/O error",6:"No such device or address",7:"Arg list too long",8:"Exec format error",9:"Bad file number",10:"No children",11:"No more processes",12:"Not enough core",13:"Permission denied",14:"Bad address",15:"Block device required",16:"Mount device busy",17:"File exists",18:"Cross-device link",19:"No such device",20:"Not a directory",21:"Is a directory",22:"Invalid argument",23:"Too many open files in system",24:"Too many open files",25:"Not a typewriter",26:"Text file busy",27:"File too large",28:"No space left on device",29:"Illegal seek",30:"Read only file system",31:"Too many links",32:"Broken pipe",33:"Math arg out of domain of func",34:"Math result not representable",35:"File locking deadlock error",36:"File or path name too long",37:"No record locks available",38:"Function not implemented",39:"Directory not empty",40:"Too many symbolic links",42:"No message of desired type",43:"Identifier removed",44:"Channel number out of range",45:"Level 2 not synchronized",46:"Level 3 halted",47:"Level 3 reset",48:"Link number out of range",49:"Protocol driver not attached",50:"No CSI structure available",51:"Level 2 halted",52:"Invalid exchange",53:"Invalid request descriptor",54:"Exchange full",55:"No anode",56:"Invalid request code",57:"Invalid slot",59:"Bad font file fmt",60:"Device not a stream",61:"No data (for no delay io)",62:"Timer expired",63:"Out of streams resources",64:"Machine is not on the network",65:"Package not installed",66:"The object is remote",67:"The link has been severed",68:"Advertise error",69:"Srmount error",70:"Communication error on send",71:"Protocol error",72:"Multihop attempted",73:"Cross mount point (not really error)",74:"Trying to read unreadable message",75:"Value too large for defined data type",76:"Given log. name not unique",77:"f.d. invalid for this operation",78:"Remote address changed",79:"Can   access a needed shared lib",80:"Accessing a corrupted shared lib",81:".lib section in a.out corrupted",82:"Attempting to link in too many libs",83:"Attempting to exec a shared library",84:"Illegal byte sequence",86:"Streams pipe error",87:"Too many users",88:"Socket operation on non-socket",89:"Destination address required",90:"Message too long",91:"Protocol wrong type for socket",92:"Protocol not available",93:"Unknown protocol",94:"Socket type not supported",95:"Not supported",96:"Protocol family not supported",97:"Address family not supported by protocol family",98:"Address already in use",99:"Address not available",100:"Network interface is not configured",101:"Network is unreachable",102:"Connection reset by network",103:"Connection aborted",104:"Connection reset by peer",105:"No buffer space available",106:"Socket is already connected",107:"Socket is not connected",108:"Can't send after socket shutdown",109:"Too many references",110:"Connection timed out",111:"Connection refused",112:"Host is down",113:"Host is unreachable",114:"Socket already connected",115:"Connection already in progress",116:"Stale file handle",122:"Quota exceeded",123:"No medium (in tape drive)",125:"Operation canceled",130:"Previous owner died",131:"State not recoverable"};

  var PATH={splitPath:function (filename) {
        var splitPathRe = /^(\/?|)([\s\S]*?)((?:\.{1,2}|[^\/]+?|)(\.[^.\/]*|))(?:[\/]*)$/;
        return splitPathRe.exec(filename).slice(1);
      },normalizeArray:function (parts, allowAboveRoot) {
        // if the path tries to go above the root, `up` ends up > 0
        var up = 0;
        for (var i = parts.length - 1; i >= 0; i--) {
          var last = parts[i];
          if (last === '.') {
            parts.splice(i, 1);
          } else if (last === '..') {
            parts.splice(i, 1);
            up++;
          } else if (up) {
            parts.splice(i, 1);
            up--;
          }
        }
        // if the path is allowed to go above the root, restore leading ..s
        if (allowAboveRoot) {
          for (; up; up--) {
            parts.unshift('..');
          }
        }
        return parts;
      },normalize:function (path) {
        var isAbsolute = path.charAt(0) === '/',
            trailingSlash = path.substr(-1) === '/';
        // Normalize the path
        path = PATH.normalizeArray(path.split('/').filter(function(p) {
          return !!p;
        }), !isAbsolute).join('/');
        if (!path && !isAbsolute) {
          path = '.';
        }
        if (path && trailingSlash) {
          path += '/';
        }
        return (isAbsolute ? '/' : '') + path;
      },dirname:function (path) {
        var result = PATH.splitPath(path),
            root = result[0],
            dir = result[1];
        if (!root && !dir) {
          // No dirname whatsoever
          return '.';
        }
        if (dir) {
          // It has a dirname, strip trailing slash
          dir = dir.substr(0, dir.length - 1);
        }
        return root + dir;
      },basename:function (path) {
        // EMSCRIPTEN return '/'' for '/', not an empty string
        if (path === '/') return '/';
        var lastSlash = path.lastIndexOf('/');
        if (lastSlash === -1) return path;
        return path.substr(lastSlash+1);
      },extname:function (path) {
        return PATH.splitPath(path)[3];
      },join:function () {
        var paths = Array.prototype.slice.call(arguments, 0);
        return PATH.normalize(paths.join('/'));
      },join2:function (l, r) {
        return PATH.normalize(l + '/' + r);
      },resolve:function () {
        var resolvedPath = '',
          resolvedAbsolute = false;
        for (var i = arguments.length - 1; i >= -1 && !resolvedAbsolute; i--) {
          var path = (i >= 0) ? arguments[i] : FS.cwd();
          // Skip empty and invalid entries
          if (typeof path !== 'string') {
            throw new TypeError('Arguments to path.resolve must be strings');
          } else if (!path) {
            return ''; // an invalid portion invalidates the whole thing
          }
          resolvedPath = path + '/' + resolvedPath;
          resolvedAbsolute = path.charAt(0) === '/';
        }
        // At this point the path should be resolved to a full absolute path, but
        // handle relative paths to be safe (might happen when process.cwd() fails)
        resolvedPath = PATH.normalizeArray(resolvedPath.split('/').filter(function(p) {
          return !!p;
        }), !resolvedAbsolute).join('/');
        return ((resolvedAbsolute ? '/' : '') + resolvedPath) || '.';
      },relative:function (from, to) {
        from = PATH.resolve(from).substr(1);
        to = PATH.resolve(to).substr(1);
        function trim(arr) {
          var start = 0;
          for (; start < arr.length; start++) {
            if (arr[start] !== '') break;
          }
          var end = arr.length - 1;
          for (; end >= 0; end--) {
            if (arr[end] !== '') break;
          }
          if (start > end) return [];
          return arr.slice(start, end - start + 1);
        }
        var fromParts = trim(from.split('/'));
        var toParts = trim(to.split('/'));
        var length = Math.min(fromParts.length, toParts.length);
        var samePartsLength = length;
        for (var i = 0; i < length; i++) {
          if (fromParts[i] !== toParts[i]) {
            samePartsLength = i;
            break;
          }
        }
        var outputParts = [];
        for (var i = samePartsLength; i < fromParts.length; i++) {
          outputParts.push('..');
        }
        outputParts = outputParts.concat(toParts.slice(samePartsLength));
        return outputParts.join('/');
      }};

  var TTY={ttys:[],init:function () {
        // https://github.com/kripken/emscripten/pull/1555
        // if (ENVIRONMENT_IS_NODE) {
        //   // currently, FS.init does not distinguish if process.stdin is a file or TTY
        //   // device, it always assumes it's a TTY device. because of this, we're forcing
        //   // process.stdin to UTF8 encoding to at least make stdin reading compatible
        //   // with text files until FS.init can be refactored.
        //   process['stdin']['setEncoding']('utf8');
        // }
      },shutdown:function () {
        // https://github.com/kripken/emscripten/pull/1555
        // if (ENVIRONMENT_IS_NODE) {
        //   // inolen: any idea as to why node -e 'process.stdin.read()' wouldn't exit immediately (with process.stdin being a tty)?
        //   // isaacs: because now it's reading from the stream, you've expressed interest in it, so that read() kicks off a _read() which creates a ReadReq operation
        //   // inolen: I thought read() in that case was a synchronous operation that just grabbed some amount of buffered data if it exists?
        //   // isaacs: it is. but it also triggers a _read() call, which calls readStart() on the handle
        //   // isaacs: do process.stdin.pause() and i'd think it'd probably close the pending call
        //   process['stdin']['pause']();
        // }
      },register:function (dev, ops) {
        TTY.ttys[dev] = { input: [], output: [], ops: ops };
        FS.registerDevice(dev, TTY.stream_ops);
      },stream_ops:{open:function (stream) {
          var tty = TTY.ttys[stream.node.rdev];
          if (!tty) {
            throw new FS.ErrnoError(ERRNO_CODES.ENODEV);
          }
          stream.tty = tty;
          stream.seekable = false;
        },close:function (stream) {
          // flush any pending line data
          stream.tty.ops.flush(stream.tty);
        },flush:function (stream) {
          stream.tty.ops.flush(stream.tty);
        },read:function (stream, buffer, offset, length, pos /* ignored */) {
          if (!stream.tty || !stream.tty.ops.get_char) {
            throw new FS.ErrnoError(ERRNO_CODES.ENXIO);
          }
          var bytesRead = 0;
          for (var i = 0; i < length; i++) {
            var result;
            try {
              result = stream.tty.ops.get_char(stream.tty);
            } catch (e) {
              throw new FS.ErrnoError(ERRNO_CODES.EIO);
            }
            if (result === undefined && bytesRead === 0) {
              throw new FS.ErrnoError(ERRNO_CODES.EAGAIN);
            }
            if (result === null || result === undefined) break;
            bytesRead++;
            buffer[offset+i] = result;
          }
          if (bytesRead) {
            stream.node.timestamp = Date.now();
          }
          return bytesRead;
        },write:function (stream, buffer, offset, length, pos) {
          if (!stream.tty || !stream.tty.ops.put_char) {
            throw new FS.ErrnoError(ERRNO_CODES.ENXIO);
          }
          for (var i = 0; i < length; i++) {
            try {
              stream.tty.ops.put_char(stream.tty, buffer[offset+i]);
            } catch (e) {
              throw new FS.ErrnoError(ERRNO_CODES.EIO);
            }
          }
          if (length) {
            stream.node.timestamp = Date.now();
          }
          return i;
        }},default_tty_ops:{get_char:function (tty) {
          if (!tty.input.length) {
            var result = null;
            if (ENVIRONMENT_IS_NODE) {
              // we will read data by chunks of BUFSIZE
              var BUFSIZE = 256;
              var buf = new Buffer(BUFSIZE);
              var bytesRead = 0;

              var isPosixPlatform = (process.platform != 'win32'); // Node doesn't offer a direct check, so test by exclusion

              var fd = process.stdin.fd;
              if (isPosixPlatform) {
                // Linux and Mac cannot use process.stdin.fd (which isn't set up as sync)
                var usingDevice = false;
                try {
                  fd = fs.openSync('/dev/stdin', 'r');
                  usingDevice = true;
                } catch (e) {}
              }

              try {
                bytesRead = fs.readSync(fd, buf, 0, BUFSIZE, null);
              } catch(e) {
                // Cross-platform differences: on Windows, reading EOF throws an exception, but on other OSes,
                // reading EOF returns 0. Uniformize behavior by treating the EOF exception to return 0.
                if (e.toString().indexOf('EOF') != -1) bytesRead = 0;
                else throw e;
              }

              if (usingDevice) { fs.closeSync(fd); }
              if (bytesRead > 0) {
                result = buf.slice(0, bytesRead).toString('utf-8');
              } else {
                result = null;
              }

            } else if (typeof window != 'undefined' &&
              typeof window.prompt == 'function') {
              // Browser.
              result = window.prompt('Input: ');  // returns null on cancel
              if (result !== null) {
                result += '\n';
              }
            } else if (typeof readline == 'function') {
              // Command line.
              result = readline();
              if (result !== null) {
                result += '\n';
              }
            }
            if (!result) {
              return null;
            }
            tty.input = intArrayFromString(result, true);
          }
          return tty.input.shift();
        },put_char:function (tty, val) {
          if (val === null || val === 10) {
            out(UTF8ArrayToString(tty.output, 0));
            tty.output = [];
          } else {
            if (val != 0) tty.output.push(val); // val == 0 would cut text output off in the middle.
          }
        },flush:function (tty) {
          if (tty.output && tty.output.length > 0) {
            out(UTF8ArrayToString(tty.output, 0));
            tty.output = [];
          }
        }},default_tty1_ops:{put_char:function (tty, val) {
          if (val === null || val === 10) {
            err(UTF8ArrayToString(tty.output, 0));
            tty.output = [];
          } else {
            if (val != 0) tty.output.push(val);
          }
        },flush:function (tty) {
          if (tty.output && tty.output.length > 0) {
            err(UTF8ArrayToString(tty.output, 0));
            tty.output = [];
          }
        }}};

  var MEMFS={ops_table:null,mount:function (mount) {
        return MEMFS.createNode(null, '/', 16384 | 511 /* 0777 */, 0);
      },createNode:function (parent, name, mode, dev) {
        if (FS.isBlkdev(mode) || FS.isFIFO(mode)) {
          // no supported
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        }
        if (!MEMFS.ops_table) {
          MEMFS.ops_table = {
            dir: {
              node: {
                getattr: MEMFS.node_ops.getattr,
                setattr: MEMFS.node_ops.setattr,
                lookup: MEMFS.node_ops.lookup,
                mknod: MEMFS.node_ops.mknod,
                rename: MEMFS.node_ops.rename,
                unlink: MEMFS.node_ops.unlink,
                rmdir: MEMFS.node_ops.rmdir,
                readdir: MEMFS.node_ops.readdir,
                symlink: MEMFS.node_ops.symlink
              },
              stream: {
                llseek: MEMFS.stream_ops.llseek
              }
            },
            file: {
              node: {
                getattr: MEMFS.node_ops.getattr,
                setattr: MEMFS.node_ops.setattr
              },
              stream: {
                llseek: MEMFS.stream_ops.llseek,
                read: MEMFS.stream_ops.read,
                write: MEMFS.stream_ops.write,
                allocate: MEMFS.stream_ops.allocate,
                mmap: MEMFS.stream_ops.mmap,
                msync: MEMFS.stream_ops.msync
              }
            },
            link: {
              node: {
                getattr: MEMFS.node_ops.getattr,
                setattr: MEMFS.node_ops.setattr,
                readlink: MEMFS.node_ops.readlink
              },
              stream: {}
            },
            chrdev: {
              node: {
                getattr: MEMFS.node_ops.getattr,
                setattr: MEMFS.node_ops.setattr
              },
              stream: FS.chrdev_stream_ops
            }
          };
        }
        var node = FS.createNode(parent, name, mode, dev);
        if (FS.isDir(node.mode)) {
          node.node_ops = MEMFS.ops_table.dir.node;
          node.stream_ops = MEMFS.ops_table.dir.stream;
          node.contents = {};
        } else if (FS.isFile(node.mode)) {
          node.node_ops = MEMFS.ops_table.file.node;
          node.stream_ops = MEMFS.ops_table.file.stream;
          node.usedBytes = 0; // The actual number of bytes used in the typed array, as opposed to contents.length which gives the whole capacity.
          // When the byte data of the file is populated, this will point to either a typed array, or a normal JS array. Typed arrays are preferred
          // for performance, and used by default. However, typed arrays are not resizable like normal JS arrays are, so there is a small disk size
          // penalty involved for appending file writes that continuously grow a file similar to std::vector capacity vs used -scheme.
          node.contents = null;
        } else if (FS.isLink(node.mode)) {
          node.node_ops = MEMFS.ops_table.link.node;
          node.stream_ops = MEMFS.ops_table.link.stream;
        } else if (FS.isChrdev(node.mode)) {
          node.node_ops = MEMFS.ops_table.chrdev.node;
          node.stream_ops = MEMFS.ops_table.chrdev.stream;
        }
        node.timestamp = Date.now();
        // add the new node to the parent
        if (parent) {
          parent.contents[name] = node;
        }
        return node;
      },getFileDataAsRegularArray:function (node) {
        if (node.contents && node.contents.subarray) {
          var arr = [];
          for (var i = 0; i < node.usedBytes; ++i) arr.push(node.contents[i]);
          return arr; // Returns a copy of the original data.
        }
        return node.contents; // No-op, the file contents are already in a JS array. Return as-is.
      },getFileDataAsTypedArray:function (node) {
        if (!node.contents) return new Uint8Array;
        if (node.contents.subarray) return node.contents.subarray(0, node.usedBytes); // Make sure to not return excess unused bytes.
        return new Uint8Array(node.contents);
      },expandFileStorage:function (node, newCapacity) {
        // If we are asked to expand the size of a file that already exists, revert to using a standard JS array to store the file
        // instead of a typed array. This makes resizing the array more flexible because we can just .push() elements at the back to
        // increase the size.
        if (node.contents && node.contents.subarray && newCapacity > node.contents.length) {
          node.contents = MEMFS.getFileDataAsRegularArray(node);
          node.usedBytes = node.contents.length; // We might be writing to a lazy-loaded file which had overridden this property, so force-reset it.
        }

        if (!node.contents || node.contents.subarray) { // Keep using a typed array if creating a new storage, or if old one was a typed array as well.
          var prevCapacity = node.contents ? node.contents.length : 0;
          if (prevCapacity >= newCapacity) return; // No need to expand, the storage was already large enough.
          // Don't expand strictly to the given requested limit if it's only a very small increase, but instead geometrically grow capacity.
          // For small filesizes (<1MB), perform size*2 geometric increase, but for large sizes, do a much more conservative size*1.125 increase to
          // avoid overshooting the allocation cap by a very large margin.
          var CAPACITY_DOUBLING_MAX = 1024 * 1024;
          newCapacity = Math.max(newCapacity, (prevCapacity * (prevCapacity < CAPACITY_DOUBLING_MAX ? 2.0 : 1.125)) | 0);
          if (prevCapacity != 0) newCapacity = Math.max(newCapacity, 256); // At minimum allocate 256b for each file when expanding.
          var oldContents = node.contents;
          node.contents = new Uint8Array(newCapacity); // Allocate new storage.
          if (node.usedBytes > 0) node.contents.set(oldContents.subarray(0, node.usedBytes), 0); // Copy old data over to the new storage.
          return;
        }
        // Not using a typed array to back the file storage. Use a standard JS array instead.
        if (!node.contents && newCapacity > 0) node.contents = [];
        while (node.contents.length < newCapacity) node.contents.push(0);
      },resizeFileStorage:function (node, newSize) {
        if (node.usedBytes == newSize) return;
        if (newSize == 0) {
          node.contents = null; // Fully decommit when requesting a resize to zero.
          node.usedBytes = 0;
          return;
        }
        if (!node.contents || node.contents.subarray) { // Resize a typed array if that is being used as the backing store.
          var oldContents = node.contents;
          node.contents = new Uint8Array(new ArrayBuffer(newSize)); // Allocate new storage.
          if (oldContents) {
            node.contents.set(oldContents.subarray(0, Math.min(newSize, node.usedBytes))); // Copy old data over to the new storage.
          }
          node.usedBytes = newSize;
          return;
        }
        // Backing with a JS array.
        if (!node.contents) node.contents = [];
        if (node.contents.length > newSize) node.contents.length = newSize;
        else while (node.contents.length < newSize) node.contents.push(0);
        node.usedBytes = newSize;
      },node_ops:{getattr:function (node) {
          var attr = {};
          // device numbers reuse inode numbers.
          attr.dev = FS.isChrdev(node.mode) ? node.id : 1;
          attr.ino = node.id;
          attr.mode = node.mode;
          attr.nlink = 1;
          attr.uid = 0;
          attr.gid = 0;
          attr.rdev = node.rdev;
          if (FS.isDir(node.mode)) {
            attr.size = 4096;
          } else if (FS.isFile(node.mode)) {
            attr.size = node.usedBytes;
          } else if (FS.isLink(node.mode)) {
            attr.size = node.link.length;
          } else {
            attr.size = 0;
          }
          attr.atime = new Date(node.timestamp);
          attr.mtime = new Date(node.timestamp);
          attr.ctime = new Date(node.timestamp);
          // NOTE: In our implementation, st_blocks = Math.ceil(st_size/st_blksize),
          //       but this is not required by the standard.
          attr.blksize = 4096;
          attr.blocks = Math.ceil(attr.size / attr.blksize);
          return attr;
        },setattr:function (node, attr) {
          if (attr.mode !== undefined) {
            node.mode = attr.mode;
          }
          if (attr.timestamp !== undefined) {
            node.timestamp = attr.timestamp;
          }
          if (attr.size !== undefined) {
            MEMFS.resizeFileStorage(node, attr.size);
          }
        },lookup:function (parent, name) {
          throw FS.genericErrors[ERRNO_CODES.ENOENT];
        },mknod:function (parent, name, mode, dev) {
          return MEMFS.createNode(parent, name, mode, dev);
        },rename:function (old_node, new_dir, new_name) {
          // if we're overwriting a directory at new_name, make sure it's empty.
          if (FS.isDir(old_node.mode)) {
            var new_node;
            try {
              new_node = FS.lookupNode(new_dir, new_name);
            } catch (e) {
            }
            if (new_node) {
              for (var i in new_node.contents) {
                throw new FS.ErrnoError(ERRNO_CODES.ENOTEMPTY);
              }
            }
          }
          // do the internal rewiring
          delete old_node.parent.contents[old_node.name];
          old_node.name = new_name;
          new_dir.contents[new_name] = old_node;
          old_node.parent = new_dir;
        },unlink:function (parent, name) {
          delete parent.contents[name];
        },rmdir:function (parent, name) {
          var node = FS.lookupNode(parent, name);
          for (var i in node.contents) {
            throw new FS.ErrnoError(ERRNO_CODES.ENOTEMPTY);
          }
          delete parent.contents[name];
        },readdir:function (node) {
          var entries = ['.', '..']
          for (var key in node.contents) {
            if (!node.contents.hasOwnProperty(key)) {
              continue;
            }
            entries.push(key);
          }
          return entries;
        },symlink:function (parent, newname, oldpath) {
          var node = MEMFS.createNode(parent, newname, 511 /* 0777 */ | 40960, 0);
          node.link = oldpath;
          return node;
        },readlink:function (node) {
          if (!FS.isLink(node.mode)) {
            throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
          }
          return node.link;
        }},stream_ops:{read:function (stream, buffer, offset, length, position) {
          var contents = stream.node.contents;
          if (position >= stream.node.usedBytes) return 0;
          var size = Math.min(stream.node.usedBytes - position, length);
          assert(size >= 0);
          if (size > 8 && contents.subarray) { // non-trivial, and typed array
            buffer.set(contents.subarray(position, position + size), offset);
          } else {
            for (var i = 0; i < size; i++) buffer[offset + i] = contents[position + i];
          }
          return size;
        },write:function (stream, buffer, offset, length, position, canOwn) {
          if (!length) return 0;
          var node = stream.node;
          node.timestamp = Date.now();

          if (buffer.subarray && (!node.contents || node.contents.subarray)) { // This write is from a typed array to a typed array?
            if (canOwn) {
              node.contents = buffer.subarray(offset, offset + length);
              node.usedBytes = length;
              return length;
            } else if (node.usedBytes === 0 && position === 0) { // If this is a simple first write to an empty file, do a fast set since we don't need to care about old data.
              node.contents = new Uint8Array(buffer.subarray(offset, offset + length));
              node.usedBytes = length;
              return length;
            } else if (position + length <= node.usedBytes) { // Writing to an already allocated and used subrange of the file?
              node.contents.set(buffer.subarray(offset, offset + length), position);
              return length;
            }
          }

          // Appending to an existing file and we need to reallocate, or source data did not come as a typed array.
          MEMFS.expandFileStorage(node, position+length);
          if (node.contents.subarray && buffer.subarray) node.contents.set(buffer.subarray(offset, offset + length), position); // Use typed array write if available.
          else {
            for (var i = 0; i < length; i++) {
             node.contents[position + i] = buffer[offset + i]; // Or fall back to manual write if not.
            }
          }
          node.usedBytes = Math.max(node.usedBytes, position+length);
          return length;
        },llseek:function (stream, offset, whence) {
          var position = offset;
          if (whence === 1) {  // SEEK_CUR.
            position += stream.position;
          } else if (whence === 2) {  // SEEK_END.
            if (FS.isFile(stream.node.mode)) {
              position += stream.node.usedBytes;
            }
          }
          if (position < 0) {
            throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
          }
          return position;
        },allocate:function (stream, offset, length) {
          MEMFS.expandFileStorage(stream.node, offset + length);
          stream.node.usedBytes = Math.max(stream.node.usedBytes, offset + length);
        },mmap:function (stream, buffer, offset, length, position, prot, flags) {
          if (!FS.isFile(stream.node.mode)) {
            throw new FS.ErrnoError(ERRNO_CODES.ENODEV);
          }
          var ptr;
          var allocated;
          var contents = stream.node.contents;
          // Only make a new copy when MAP_PRIVATE is specified.
          if ( !(flags & 2) &&
                (contents.buffer === buffer || contents.buffer === buffer.buffer) ) {
            // We can't emulate MAP_SHARED when the file is not backed by the buffer
            // we're mapping to (e.g. the HEAP buffer).
            allocated = false;
            ptr = contents.byteOffset;
          } else {
            // Try to avoid unnecessary slices.
            if (position > 0 || position + length < stream.node.usedBytes) {
              if (contents.subarray) {
                contents = contents.subarray(position, position + length);
              } else {
                contents = Array.prototype.slice.call(contents, position, position + length);
              }
            }
            allocated = true;
            ptr = _malloc(length);
            if (!ptr) {
              throw new FS.ErrnoError(ERRNO_CODES.ENOMEM);
            }
            buffer.set(contents, ptr);
          }
          return { ptr: ptr, allocated: allocated };
        },msync:function (stream, buffer, offset, length, mmapFlags) {
          if (!FS.isFile(stream.node.mode)) {
            throw new FS.ErrnoError(ERRNO_CODES.ENODEV);
          }
          if (mmapFlags & 2) {
            // MAP_PRIVATE calls need not to be synced back to underlying fs
            return 0;
          }

          var bytesWritten = MEMFS.stream_ops.write(stream, buffer, 0, length, offset, false);
          // should we check if bytesWritten and length are the same?
          return 0;
        }}};

  var IDBFS={dbs:{},indexedDB:function () {
        if (typeof indexedDB !== 'undefined') return indexedDB;
        var ret = null;
        if (typeof window === 'object') ret = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;
        assert(ret, 'IDBFS used, but indexedDB not supported');
        return ret;
      },DB_VERSION:21,DB_STORE_NAME:"FILE_DATA",mount:function (mount) {
        // reuse all of the core MEMFS functionality
        return MEMFS.mount.apply(null, arguments);
      },syncfs:function (mount, populate, callback) {
        IDBFS.getLocalSet(mount, function(err, local) {
          if (err) return callback(err);

          IDBFS.getRemoteSet(mount, function(err, remote) {
            if (err) return callback(err);

            var src = populate ? remote : local;
            var dst = populate ? local : remote;

            IDBFS.reconcile(src, dst, callback);
          });
        });
      },getDB:function (name, callback) {
        // check the cache first
        var db = IDBFS.dbs[name];
        if (db) {
          return callback(null, db);
        }

        var req;
        try {
          req = IDBFS.indexedDB().open(name, IDBFS.DB_VERSION);
        } catch (e) {
          return callback(e);
        }
        if (!req) {
          return callback("Unable to connect to IndexedDB");
        }
        req.onupgradeneeded = function(e) {
          var db = e.target.result;
          var transaction = e.target.transaction;

          var fileStore;

          if (db.objectStoreNames.contains(IDBFS.DB_STORE_NAME)) {
            fileStore = transaction.objectStore(IDBFS.DB_STORE_NAME);
          } else {
            fileStore = db.createObjectStore(IDBFS.DB_STORE_NAME);
          }

          if (!fileStore.indexNames.contains('timestamp')) {
            fileStore.createIndex('timestamp', 'timestamp', { unique: false });
          }
        };
        req.onsuccess = function() {
          db = req.result;

          // add to the cache
          IDBFS.dbs[name] = db;
          callback(null, db);
        };
        req.onerror = function(e) {
          callback(this.error);
          e.preventDefault();
        };
      },getLocalSet:function (mount, callback) {
        var entries = {};

        function isRealDir(p) {
          return p !== '.' && p !== '..';
        };
        function toAbsolute(root) {
          return function(p) {
            return PATH.join2(root, p);
          }
        };

        var check = FS.readdir(mount.mountpoint).filter(isRealDir).map(toAbsolute(mount.mountpoint));

        while (check.length) {
          var path = check.pop();
          var stat;

          try {
            stat = FS.stat(path);
          } catch (e) {
            return callback(e);
          }

          if (FS.isDir(stat.mode)) {
            check.push.apply(check, FS.readdir(path).filter(isRealDir).map(toAbsolute(path)));
          }

          entries[path] = { timestamp: stat.mtime };
        }

        return callback(null, { type: 'local', entries: entries });
      },getRemoteSet:function (mount, callback) {
        var entries = {};

        IDBFS.getDB(mount.mountpoint, function(err, db) {
          if (err) return callback(err);

          try {
            var transaction = db.transaction([IDBFS.DB_STORE_NAME], 'readonly');
            transaction.onerror = function(e) {
              callback(this.error);
              e.preventDefault();
            };

            var store = transaction.objectStore(IDBFS.DB_STORE_NAME);
            var index = store.index('timestamp');

            index.openKeyCursor().onsuccess = function(event) {
              var cursor = event.target.result;

              if (!cursor) {
                return callback(null, { type: 'remote', db: db, entries: entries });
              }

              entries[cursor.primaryKey] = { timestamp: cursor.key };

              cursor.continue();
            };
          } catch (e) {
            return callback(e);
          }
        });
      },loadLocalEntry:function (path, callback) {
        var stat, node;

        try {
          var lookup = FS.lookupPath(path);
          node = lookup.node;
          stat = FS.stat(path);
        } catch (e) {
          return callback(e);
        }

        if (FS.isDir(stat.mode)) {
          return callback(null, { timestamp: stat.mtime, mode: stat.mode });
        } else if (FS.isFile(stat.mode)) {
          // Performance consideration: storing a normal JavaScript array to a IndexedDB is much slower than storing a typed array.
          // Therefore always convert the file contents to a typed array first before writing the data to IndexedDB.
          node.contents = MEMFS.getFileDataAsTypedArray(node);
          return callback(null, { timestamp: stat.mtime, mode: stat.mode, contents: node.contents });
        } else {
          return callback(new Error('node type not supported'));
        }
      },storeLocalEntry:function (path, entry, callback) {
        try {
          if (FS.isDir(entry.mode)) {
            FS.mkdir(path, entry.mode);
          } else if (FS.isFile(entry.mode)) {
            FS.writeFile(path, entry.contents, { canOwn: true });
          } else {
            return callback(new Error('node type not supported'));
          }

          FS.chmod(path, entry.mode);
          FS.utime(path, entry.timestamp, entry.timestamp);
        } catch (e) {
          return callback(e);
        }

        callback(null);
      },removeLocalEntry:function (path, callback) {
        try {
          var lookup = FS.lookupPath(path);
          var stat = FS.stat(path);

          if (FS.isDir(stat.mode)) {
            FS.rmdir(path);
          } else if (FS.isFile(stat.mode)) {
            FS.unlink(path);
          }
        } catch (e) {
          return callback(e);
        }

        callback(null);
      },loadRemoteEntry:function (store, path, callback) {
        var req = store.get(path);
        req.onsuccess = function(event) { callback(null, event.target.result); };
        req.onerror = function(e) {
          callback(this.error);
          e.preventDefault();
        };
      },storeRemoteEntry:function (store, path, entry, callback) {
        var req = store.put(entry, path);
        req.onsuccess = function() { callback(null); };
        req.onerror = function(e) {
          callback(this.error);
          e.preventDefault();
        };
      },removeRemoteEntry:function (store, path, callback) {
        var req = store.delete(path);
        req.onsuccess = function() { callback(null); };
        req.onerror = function(e) {
          callback(this.error);
          e.preventDefault();
        };
      },reconcile:function (src, dst, callback) {
        var total = 0;

        var create = [];
        Object.keys(src.entries).forEach(function (key) {
          var e = src.entries[key];
          var e2 = dst.entries[key];
          if (!e2 || e.timestamp > e2.timestamp) {
            create.push(key);
            total++;
          }
        });

        var remove = [];
        Object.keys(dst.entries).forEach(function (key) {
          var e = dst.entries[key];
          var e2 = src.entries[key];
          if (!e2) {
            remove.push(key);
            total++;
          }
        });

        if (!total) {
          return callback(null);
        }

        var errored = false;
        var completed = 0;
        var db = src.type === 'remote' ? src.db : dst.db;
        var transaction = db.transaction([IDBFS.DB_STORE_NAME], 'readwrite');
        var store = transaction.objectStore(IDBFS.DB_STORE_NAME);

        function done(err) {
          if (err) {
            if (!done.errored) {
              done.errored = true;
              return callback(err);
            }
            return;
          }
          if (++completed >= total) {
            return callback(null);
          }
        };

        transaction.onerror = function(e) {
          done(this.error);
          e.preventDefault();
        };

        // sort paths in ascending order so directory entries are created
        // before the files inside them
        create.sort().forEach(function (path) {
          if (dst.type === 'local') {
            IDBFS.loadRemoteEntry(store, path, function (err, entry) {
              if (err) return done(err);
              IDBFS.storeLocalEntry(path, entry, done);
            });
          } else {
            IDBFS.loadLocalEntry(path, function (err, entry) {
              if (err) return done(err);
              IDBFS.storeRemoteEntry(store, path, entry, done);
            });
          }
        });

        // sort paths in descending order so files are deleted before their
        // parent directories
        remove.sort().reverse().forEach(function(path) {
          if (dst.type === 'local') {
            IDBFS.removeLocalEntry(path, done);
          } else {
            IDBFS.removeRemoteEntry(store, path, done);
          }
        });
      }};

  var NODEFS={isWindows:false,staticInit:function () {
        NODEFS.isWindows = !!process.platform.match(/^win/);
        var flags = process["binding"]("constants");
        // Node.js 4 compatibility: it has no namespaces for constants
        if (flags["fs"]) {
          flags = flags["fs"];
        }
        NODEFS.flagsForNodeMap = {
          "1024": flags["O_APPEND"],
          "64": flags["O_CREAT"],
          "128": flags["O_EXCL"],
          "0": flags["O_RDONLY"],
          "2": flags["O_RDWR"],
          "4096": flags["O_SYNC"],
          "512": flags["O_TRUNC"],
          "1": flags["O_WRONLY"]
        };
      },bufferFrom:function (arrayBuffer) {
        // Node.js < 4.5 compatibility: Buffer.from does not support ArrayBuffer
        // Buffer.from before 4.5 was just a method inherited from Uint8Array
        // Buffer.alloc has been added with Buffer.from together, so check it instead
        return Buffer.alloc ? Buffer.from(arrayBuffer) : new Buffer(arrayBuffer);
      },mount:function (mount) {
        assert(ENVIRONMENT_IS_NODE);
        return NODEFS.createNode(null, '/', NODEFS.getMode(mount.opts.root), 0);
      },createNode:function (parent, name, mode, dev) {
        if (!FS.isDir(mode) && !FS.isFile(mode) && !FS.isLink(mode)) {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        var node = FS.createNode(parent, name, mode);
        node.node_ops = NODEFS.node_ops;
        node.stream_ops = NODEFS.stream_ops;
        return node;
      },getMode:function (path) {
        var stat;
        try {
          stat = fs.lstatSync(path);
          if (NODEFS.isWindows) {
            // Node.js on Windows never represents permission bit 'x', so
            // propagate read bits to execute bits
            stat.mode = stat.mode | ((stat.mode & 292) >> 2);
          }
        } catch (e) {
          if (!e.code) throw e;
          throw new FS.ErrnoError(ERRNO_CODES[e.code]);
        }
        return stat.mode;
      },realPath:function (node) {
        var parts = [];
        while (node.parent !== node) {
          parts.push(node.name);
          node = node.parent;
        }
        parts.push(node.mount.opts.root);
        parts.reverse();
        return PATH.join.apply(null, parts);
      },flagsForNode:function (flags) {
        flags &= ~0x200000 /*O_PATH*/; // Ignore this flag from musl, otherwise node.js fails to open the file.
        flags &= ~0x800 /*O_NONBLOCK*/; // Ignore this flag from musl, otherwise node.js fails to open the file.
        flags &= ~0x8000 /*O_LARGEFILE*/; // Ignore this flag from musl, otherwise node.js fails to open the file.
        flags &= ~0x80000 /*O_CLOEXEC*/; // Some applications may pass it; it makes no sense for a single process.
        var newFlags = 0;
        for (var k in NODEFS.flagsForNodeMap) {
          if (flags & k) {
            newFlags |= NODEFS.flagsForNodeMap[k];
            flags ^= k;
          }
        }

        if (!flags) {
          return newFlags;
        } else {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
      },node_ops:{getattr:function (node) {
          var path = NODEFS.realPath(node);
          var stat;
          try {
            stat = fs.lstatSync(path);
          } catch (e) {
            if (!e.code) throw e;
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
          // node.js v0.10.20 doesn't report blksize and blocks on Windows. Fake them with default blksize of 4096.
          // See http://support.microsoft.com/kb/140365
          if (NODEFS.isWindows && !stat.blksize) {
            stat.blksize = 4096;
          }
          if (NODEFS.isWindows && !stat.blocks) {
            stat.blocks = (stat.size+stat.blksize-1)/stat.blksize|0;
          }
          return {
            dev: stat.dev,
            ino: stat.ino,
            mode: stat.mode,
            nlink: stat.nlink,
            uid: stat.uid,
            gid: stat.gid,
            rdev: stat.rdev,
            size: stat.size,
            atime: stat.atime,
            mtime: stat.mtime,
            ctime: stat.ctime,
            blksize: stat.blksize,
            blocks: stat.blocks
          };
        },setattr:function (node, attr) {
          var path = NODEFS.realPath(node);
          try {
            if (attr.mode !== undefined) {
              fs.chmodSync(path, attr.mode);
              // update the common node structure mode as well
              node.mode = attr.mode;
            }
            if (attr.timestamp !== undefined) {
              var date = new Date(attr.timestamp);
              fs.utimesSync(path, date, date);
            }
            if (attr.size !== undefined) {
              fs.truncateSync(path, attr.size);
            }
          } catch (e) {
            if (!e.code) throw e;
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
        },lookup:function (parent, name) {
          var path = PATH.join2(NODEFS.realPath(parent), name);
          var mode = NODEFS.getMode(path);
          return NODEFS.createNode(parent, name, mode);
        },mknod:function (parent, name, mode, dev) {
          var node = NODEFS.createNode(parent, name, mode, dev);
          // create the backing node for this in the fs root as well
          var path = NODEFS.realPath(node);
          try {
            if (FS.isDir(node.mode)) {
              fs.mkdirSync(path, node.mode);
            } else {
              fs.writeFileSync(path, '', { mode: node.mode });
            }
          } catch (e) {
            if (!e.code) throw e;
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
          return node;
        },rename:function (oldNode, newDir, newName) {
          var oldPath = NODEFS.realPath(oldNode);
          var newPath = PATH.join2(NODEFS.realPath(newDir), newName);
          try {
            fs.renameSync(oldPath, newPath);
          } catch (e) {
            if (!e.code) throw e;
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
        },unlink:function (parent, name) {
          var path = PATH.join2(NODEFS.realPath(parent), name);
          try {
            fs.unlinkSync(path);
          } catch (e) {
            if (!e.code) throw e;
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
        },rmdir:function (parent, name) {
          var path = PATH.join2(NODEFS.realPath(parent), name);
          try {
            fs.rmdirSync(path);
          } catch (e) {
            if (!e.code) throw e;
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
        },readdir:function (node) {
          var path = NODEFS.realPath(node);
          try {
            return fs.readdirSync(path);
          } catch (e) {
            if (!e.code) throw e;
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
        },symlink:function (parent, newName, oldPath) {
          var newPath = PATH.join2(NODEFS.realPath(parent), newName);
          try {
            fs.symlinkSync(oldPath, newPath);
          } catch (e) {
            if (!e.code) throw e;
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
        },readlink:function (node) {
          var path = NODEFS.realPath(node);
          try {
            path = fs.readlinkSync(path);
            path = NODEJS_PATH.relative(NODEJS_PATH.resolve(node.mount.opts.root), path);
            return path;
          } catch (e) {
            if (!e.code) throw e;
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
        }},stream_ops:{open:function (stream) {
          var path = NODEFS.realPath(stream.node);
          try {
            if (FS.isFile(stream.node.mode)) {
              stream.nfd = fs.openSync(path, NODEFS.flagsForNode(stream.flags));
            }
          } catch (e) {
            if (!e.code) throw e;
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
        },close:function (stream) {
          try {
            if (FS.isFile(stream.node.mode) && stream.nfd) {
              fs.closeSync(stream.nfd);
            }
          } catch (e) {
            if (!e.code) throw e;
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
        },read:function (stream, buffer, offset, length, position) {
          // Node.js < 6 compatibility: node errors on 0 length reads
          if (length === 0) return 0;
          try {
            return fs.readSync(stream.nfd, NODEFS.bufferFrom(buffer.buffer), offset, length, position);
          } catch (e) {
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
        },write:function (stream, buffer, offset, length, position) {
          try {
            return fs.writeSync(stream.nfd, NODEFS.bufferFrom(buffer.buffer), offset, length, position);
          } catch (e) {
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
        },llseek:function (stream, offset, whence) {
          var position = offset;
          if (whence === 1) {  // SEEK_CUR.
            position += stream.position;
          } else if (whence === 2) {  // SEEK_END.
            if (FS.isFile(stream.node.mode)) {
              try {
                var stat = fs.fstatSync(stream.nfd);
                position += stat.size;
              } catch (e) {
                throw new FS.ErrnoError(ERRNO_CODES[e.code]);
              }
            }
          }

          if (position < 0) {
            throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
          }

          return position;
        }}};

  var WORKERFS={DIR_MODE:16895,FILE_MODE:33279,reader:null,mount:function (mount) {
        assert(ENVIRONMENT_IS_WORKER);
        if (!WORKERFS.reader) WORKERFS.reader = new FileReaderSync();
        var root = WORKERFS.createNode(null, '/', WORKERFS.DIR_MODE, 0);
        var createdParents = {};
        function ensureParent(path) {
          // return the parent node, creating subdirs as necessary
          var parts = path.split('/');
          var parent = root;
          for (var i = 0; i < parts.length-1; i++) {
            var curr = parts.slice(0, i+1).join('/');
            // Issue 4254: Using curr as a node name will prevent the node
            // from being found in FS.nameTable when FS.open is called on
            // a path which holds a child of this node,
            // given that all FS functions assume node names
            // are just their corresponding parts within their given path,
            // rather than incremental aggregates which include their parent's
            // directories.
            if (!createdParents[curr]) {
              createdParents[curr] = WORKERFS.createNode(parent, parts[i], WORKERFS.DIR_MODE, 0);
            }
            parent = createdParents[curr];
          }
          return parent;
        }
        function base(path) {
          var parts = path.split('/');
          return parts[parts.length-1];
        }
        // We also accept FileList here, by using Array.prototype
        Array.prototype.forEach.call(mount.opts["files"] || [], function(file) {
          WORKERFS.createNode(ensureParent(file.name), base(file.name), WORKERFS.FILE_MODE, 0, file, file.lastModifiedDate);
        });
        (mount.opts["blobs"] || []).forEach(function(obj) {
          WORKERFS.createNode(ensureParent(obj["name"]), base(obj["name"]), WORKERFS.FILE_MODE, 0, obj["data"]);
        });
        (mount.opts["packages"] || []).forEach(function(pack) {
          pack['metadata'].files.forEach(function(file) {
            var name = file.filename.substr(1); // remove initial slash
            WORKERFS.createNode(ensureParent(name), base(name), WORKERFS.FILE_MODE, 0, pack['blob'].slice(file.start, file.end));
          });
        });
        return root;
      },createNode:function (parent, name, mode, dev, contents, mtime) {
        var node = FS.createNode(parent, name, mode);
        node.mode = mode;
        node.node_ops = WORKERFS.node_ops;
        node.stream_ops = WORKERFS.stream_ops;
        node.timestamp = (mtime || new Date).getTime();
        assert(WORKERFS.FILE_MODE !== WORKERFS.DIR_MODE);
        if (mode === WORKERFS.FILE_MODE) {
          node.size = contents.size;
          node.contents = contents;
        } else {
          node.size = 4096;
          node.contents = {};
        }
        if (parent) {
          parent.contents[name] = node;
        }
        return node;
      },node_ops:{getattr:function (node) {
          return {
            dev: 1,
            ino: undefined,
            mode: node.mode,
            nlink: 1,
            uid: 0,
            gid: 0,
            rdev: undefined,
            size: node.size,
            atime: new Date(node.timestamp),
            mtime: new Date(node.timestamp),
            ctime: new Date(node.timestamp),
            blksize: 4096,
            blocks: Math.ceil(node.size / 4096),
          };
        },setattr:function (node, attr) {
          if (attr.mode !== undefined) {
            node.mode = attr.mode;
          }
          if (attr.timestamp !== undefined) {
            node.timestamp = attr.timestamp;
          }
        },lookup:function (parent, name) {
          throw new FS.ErrnoError(ERRNO_CODES.ENOENT);
        },mknod:function (parent, name, mode, dev) {
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        },rename:function (oldNode, newDir, newName) {
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        },unlink:function (parent, name) {
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        },rmdir:function (parent, name) {
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        },readdir:function (node) {
          var entries = ['.', '..'];
          for (var key in node.contents) {
            if (!node.contents.hasOwnProperty(key)) {
              continue;
            }
            entries.push(key);
          }
          return entries;
        },symlink:function (parent, newName, oldPath) {
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        },readlink:function (node) {
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        }},stream_ops:{read:function (stream, buffer, offset, length, position) {
          if (position >= stream.node.size) return 0;
          var chunk = stream.node.contents.slice(position, position + length);
          var ab = WORKERFS.reader.readAsArrayBuffer(chunk);
          buffer.set(new Uint8Array(ab), offset);
          return chunk.size;
        },write:function (stream, buffer, offset, length, position) {
          throw new FS.ErrnoError(ERRNO_CODES.EIO);
        },llseek:function (stream, offset, whence) {
          var position = offset;
          if (whence === 1) {  // SEEK_CUR.
            position += stream.position;
          } else if (whence === 2) {  // SEEK_END.
            if (FS.isFile(stream.node.mode)) {
              position += stream.node.size;
            }
          }
          if (position < 0) {
            throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
          }
          return position;
        }}};

  var _stdin=STATICTOP; STATICTOP += 16;;

  var _stdout=STATICTOP; STATICTOP += 16;;

  var _stderr=STATICTOP; STATICTOP += 16;;var FS={root:null,mounts:[],devices:{},streams:[],nextInode:1,nameTable:null,currentPath:"/",initialized:false,ignorePermissions:true,trackingDelegate:{},tracking:{openFlags:{READ:1,WRITE:2}},ErrnoError:null,genericErrors:{},filesystems:null,syncFSRequests:0,handleFSError:function (e) {
        if (!(e instanceof FS.ErrnoError)) throw e + ' : ' + stackTrace();
        return ___setErrNo(e.errno);
      },lookupPath:function (path, opts) {
        path = PATH.resolve(FS.cwd(), path);
        opts = opts || {};

        if (!path) return { path: '', node: null };

        var defaults = {
          follow_mount: true,
          recurse_count: 0
        };
        for (var key in defaults) {
          if (opts[key] === undefined) {
            opts[key] = defaults[key];
          }
        }

        if (opts.recurse_count > 8) {  // max recursive lookup of 8
          throw new FS.ErrnoError(ERRNO_CODES.ELOOP);
        }

        // split the path
        var parts = PATH.normalizeArray(path.split('/').filter(function(p) {
          return !!p;
        }), false);

        // start at the root
        var current = FS.root;
        var current_path = '/';

        for (var i = 0; i < parts.length; i++) {
          var islast = (i === parts.length-1);
          if (islast && opts.parent) {
            // stop resolving
            break;
          }

          current = FS.lookupNode(current, parts[i]);
          current_path = PATH.join2(current_path, parts[i]);

          // jump to the mount's root node if this is a mountpoint
          if (FS.isMountpoint(current)) {
            if (!islast || (islast && opts.follow_mount)) {
              current = current.mounted.root;
            }
          }

          // by default, lookupPath will not follow a symlink if it is the final path component.
          // setting opts.follow = true will override this behavior.
          if (!islast || opts.follow) {
            var count = 0;
            while (FS.isLink(current.mode)) {
              var link = FS.readlink(current_path);
              current_path = PATH.resolve(PATH.dirname(current_path), link);

              var lookup = FS.lookupPath(current_path, { recurse_count: opts.recurse_count });
              current = lookup.node;

              if (count++ > 40) {  // limit max consecutive symlinks to 40 (SYMLOOP_MAX).
                throw new FS.ErrnoError(ERRNO_CODES.ELOOP);
              }
            }
          }
        }

        return { path: current_path, node: current };
      },getPath:function (node) {
        var path;
        while (true) {
          if (FS.isRoot(node)) {
            var mount = node.mount.mountpoint;
            if (!path) return mount;
            return mount[mount.length-1] !== '/' ? mount + '/' + path : mount + path;
          }
          path = path ? node.name + '/' + path : node.name;
          node = node.parent;
        }
      },hashName:function (parentid, name) {
        var hash = 0;


        for (var i = 0; i < name.length; i++) {
          hash = ((hash << 5) - hash + name.charCodeAt(i)) | 0;
        }
        return ((parentid + hash) >>> 0) % FS.nameTable.length;
      },hashAddNode:function (node) {
        var hash = FS.hashName(node.parent.id, node.name);
        node.name_next = FS.nameTable[hash];
        FS.nameTable[hash] = node;
      },hashRemoveNode:function (node) {
        var hash = FS.hashName(node.parent.id, node.name);
        if (FS.nameTable[hash] === node) {
          FS.nameTable[hash] = node.name_next;
        } else {
          var current = FS.nameTable[hash];
          while (current) {
            if (current.name_next === node) {
              current.name_next = node.name_next;
              break;
            }
            current = current.name_next;
          }
        }
      },lookupNode:function (parent, name) {
        var err = FS.mayLookup(parent);
        if (err) {
          throw new FS.ErrnoError(err, parent);
        }
        var hash = FS.hashName(parent.id, name);
        for (var node = FS.nameTable[hash]; node; node = node.name_next) {
          var nodeName = node.name;
          if (node.parent.id === parent.id && nodeName === name) {
            return node;
          }
        }
        // if we failed to find it in the cache, call into the VFS
        return FS.lookup(parent, name);
      },createNode:function (parent, name, mode, rdev) {
        if (!FS.FSNode) {
          FS.FSNode = function(parent, name, mode, rdev) {
            if (!parent) {
              parent = this;  // root node sets parent to itself
            }
            this.parent = parent;
            this.mount = parent.mount;
            this.mounted = null;
            this.id = FS.nextInode++;
            this.name = name;
            this.mode = mode;
            this.node_ops = {};
            this.stream_ops = {};
            this.rdev = rdev;
          };

          FS.FSNode.prototype = {};

          // compatibility
          var readMode = 292 | 73;
          var writeMode = 146;

          // NOTE we must use Object.defineProperties instead of individual calls to
          // Object.defineProperty in order to make closure compiler happy
          Object.defineProperties(FS.FSNode.prototype, {
            read: {
              get: function() { return (this.mode & readMode) === readMode; },
              set: function(val) { val ? this.mode |= readMode : this.mode &= ~readMode; }
            },
            write: {
              get: function() { return (this.mode & writeMode) === writeMode; },
              set: function(val) { val ? this.mode |= writeMode : this.mode &= ~writeMode; }
            },
            isFolder: {
              get: function() { return FS.isDir(this.mode); }
            },
            isDevice: {
              get: function() { return FS.isChrdev(this.mode); }
            }
          });
        }

        var node = new FS.FSNode(parent, name, mode, rdev);

        FS.hashAddNode(node);

        return node;
      },destroyNode:function (node) {
        FS.hashRemoveNode(node);
      },isRoot:function (node) {
        return node === node.parent;
      },isMountpoint:function (node) {
        return !!node.mounted;
      },isFile:function (mode) {
        return (mode & 61440) === 32768;
      },isDir:function (mode) {
        return (mode & 61440) === 16384;
      },isLink:function (mode) {
        return (mode & 61440) === 40960;
      },isChrdev:function (mode) {
        return (mode & 61440) === 8192;
      },isBlkdev:function (mode) {
        return (mode & 61440) === 24576;
      },isFIFO:function (mode) {
        return (mode & 61440) === 4096;
      },isSocket:function (mode) {
        return (mode & 49152) === 49152;
      },flagModes:{"r":0,"rs":1052672,"r+":2,"w":577,"wx":705,"xw":705,"w+":578,"wx+":706,"xw+":706,"a":1089,"ax":1217,"xa":1217,"a+":1090,"ax+":1218,"xa+":1218},modeStringToFlags:function (str) {
        var flags = FS.flagModes[str];
        if (typeof flags === 'undefined') {
          throw new Error('Unknown file open mode: ' + str);
        }
        return flags;
      },flagsToPermissionString:function (flag) {
        var perms = ['r', 'w', 'rw'][flag & 3];
        if ((flag & 512)) {
          perms += 'w';
        }
        return perms;
      },nodePermissions:function (node, perms) {
        if (FS.ignorePermissions) {
          return 0;
        }
        // return 0 if any user, group or owner bits are set.
        if (perms.indexOf('r') !== -1 && !(node.mode & 292)) {
          return ERRNO_CODES.EACCES;
        } else if (perms.indexOf('w') !== -1 && !(node.mode & 146)) {
          return ERRNO_CODES.EACCES;
        } else if (perms.indexOf('x') !== -1 && !(node.mode & 73)) {
          return ERRNO_CODES.EACCES;
        }
        return 0;
      },mayLookup:function (dir) {
        var err = FS.nodePermissions(dir, 'x');
        if (err) return err;
        if (!dir.node_ops.lookup) return ERRNO_CODES.EACCES;
        return 0;
      },mayCreate:function (dir, name) {
        try {
          var node = FS.lookupNode(dir, name);
          return ERRNO_CODES.EEXIST;
        } catch (e) {
        }
        return FS.nodePermissions(dir, 'wx');
      },mayDelete:function (dir, name, isdir) {
        var node;
        try {
          node = FS.lookupNode(dir, name);
        } catch (e) {
          return e.errno;
        }
        var err = FS.nodePermissions(dir, 'wx');
        if (err) {
          return err;
        }
        if (isdir) {
          if (!FS.isDir(node.mode)) {
            return ERRNO_CODES.ENOTDIR;
          }
          if (FS.isRoot(node) || FS.getPath(node) === FS.cwd()) {
            return ERRNO_CODES.EBUSY;
          }
        } else {
          if (FS.isDir(node.mode)) {
            return ERRNO_CODES.EISDIR;
          }
        }
        return 0;
      },mayOpen:function (node, flags) {
        if (!node) {
          return ERRNO_CODES.ENOENT;
        }
        if (FS.isLink(node.mode)) {
          return ERRNO_CODES.ELOOP;
        } else if (FS.isDir(node.mode)) {
          if (FS.flagsToPermissionString(flags) !== 'r' || // opening for write
              (flags & 512)) { // TODO: check for O_SEARCH? (== search for dir only)
            return ERRNO_CODES.EISDIR;
          }
        }
        return FS.nodePermissions(node, FS.flagsToPermissionString(flags));
      },MAX_OPEN_FDS:4096,nextfd:function (fd_start, fd_end) {
        fd_start = fd_start || 0;
        fd_end = fd_end || FS.MAX_OPEN_FDS;
        for (var fd = fd_start; fd <= fd_end; fd++) {
          if (!FS.streams[fd]) {
            return fd;
          }
        }
        throw new FS.ErrnoError(ERRNO_CODES.EMFILE);
      },getStream:function (fd) {
        return FS.streams[fd];
      },createStream:function (stream, fd_start, fd_end) {
        if (!FS.FSStream) {
          FS.FSStream = function(){};
          FS.FSStream.prototype = {};
          // compatibility
          Object.defineProperties(FS.FSStream.prototype, {
            object: {
              get: function() { return this.node; },
              set: function(val) { this.node = val; }
            },
            isRead: {
              get: function() { return (this.flags & 2097155) !== 1; }
            },
            isWrite: {
              get: function() { return (this.flags & 2097155) !== 0; }
            },
            isAppend: {
              get: function() { return (this.flags & 1024); }
            }
          });
        }
        // clone it, so we can return an instance of FSStream
        var newStream = new FS.FSStream();
        for (var p in stream) {
          newStream[p] = stream[p];
        }
        stream = newStream;
        var fd = FS.nextfd(fd_start, fd_end);
        stream.fd = fd;
        FS.streams[fd] = stream;
        return stream;
      },closeStream:function (fd) {
        FS.streams[fd] = null;
      },chrdev_stream_ops:{open:function (stream) {
          var device = FS.getDevice(stream.node.rdev);
          // override node's stream ops with the device's
          stream.stream_ops = device.stream_ops;
          // forward the open call
          if (stream.stream_ops.open) {
            stream.stream_ops.open(stream);
          }
        },llseek:function () {
          throw new FS.ErrnoError(ERRNO_CODES.ESPIPE);
        }},major:function (dev) {
        return ((dev) >> 8);
      },minor:function (dev) {
        return ((dev) & 0xff);
      },makedev:function (ma, mi) {
        return ((ma) << 8 | (mi));
      },registerDevice:function (dev, ops) {
        FS.devices[dev] = { stream_ops: ops };
      },getDevice:function (dev) {
        return FS.devices[dev];
      },getMounts:function (mount) {
        var mounts = [];
        var check = [mount];

        while (check.length) {
          var m = check.pop();

          mounts.push(m);

          check.push.apply(check, m.mounts);
        }

        return mounts;
      },syncfs:function (populate, callback) {
        if (typeof(populate) === 'function') {
          callback = populate;
          populate = false;
        }

        FS.syncFSRequests++;

        if (FS.syncFSRequests > 1) {
          console.log('warning: ' + FS.syncFSRequests + ' FS.syncfs operations in flight at once, probably just doing extra work');
        }

        var mounts = FS.getMounts(FS.root.mount);
        var completed = 0;

        function doCallback(err) {
          assert(FS.syncFSRequests > 0);
          FS.syncFSRequests--;
          return callback(err);
        }

        function done(err) {
          if (err) {
            if (!done.errored) {
              done.errored = true;
              return doCallback(err);
            }
            return;
          }
          if (++completed >= mounts.length) {
            doCallback(null);
          }
        };

        // sync all mounts
        mounts.forEach(function (mount) {
          if (!mount.type.syncfs) {
            return done(null);
          }
          mount.type.syncfs(mount, populate, done);
        });
      },mount:function (type, opts, mountpoint) {
        var root = mountpoint === '/';
        var pseudo = !mountpoint;
        var node;

        if (root && FS.root) {
          throw new FS.ErrnoError(ERRNO_CODES.EBUSY);
        } else if (!root && !pseudo) {
          var lookup = FS.lookupPath(mountpoint, { follow_mount: false });

          mountpoint = lookup.path;  // use the absolute path
          node = lookup.node;

          if (FS.isMountpoint(node)) {
            throw new FS.ErrnoError(ERRNO_CODES.EBUSY);
          }

          if (!FS.isDir(node.mode)) {
            throw new FS.ErrnoError(ERRNO_CODES.ENOTDIR);
          }
        }

        var mount = {
          type: type,
          opts: opts,
          mountpoint: mountpoint,
          mounts: []
        };

        // create a root node for the fs
        var mountRoot = type.mount(mount);
        mountRoot.mount = mount;
        mount.root = mountRoot;

        if (root) {
          FS.root = mountRoot;
        } else if (node) {
          // set as a mountpoint
          node.mounted = mount;

          // add the new mount to the current mount's children
          if (node.mount) {
            node.mount.mounts.push(mount);
          }
        }

        return mountRoot;
      },unmount:function (mountpoint) {
        var lookup = FS.lookupPath(mountpoint, { follow_mount: false });

        if (!FS.isMountpoint(lookup.node)) {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }

        // destroy the nodes for this mount, and all its child mounts
        var node = lookup.node;
        var mount = node.mounted;
        var mounts = FS.getMounts(mount);

        Object.keys(FS.nameTable).forEach(function (hash) {
          var current = FS.nameTable[hash];

          while (current) {
            var next = current.name_next;

            if (mounts.indexOf(current.mount) !== -1) {
              FS.destroyNode(current);
            }

            current = next;
          }
        });

        // no longer a mountpoint
        node.mounted = null;

        // remove this mount from the child mounts
        var idx = node.mount.mounts.indexOf(mount);
        assert(idx !== -1);
        node.mount.mounts.splice(idx, 1);
      },lookup:function (parent, name) {
        return parent.node_ops.lookup(parent, name);
      },mknod:function (path, mode, dev) {
        var lookup = FS.lookupPath(path, { parent: true });
        var parent = lookup.node;
        var name = PATH.basename(path);
        if (!name || name === '.' || name === '..') {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        var err = FS.mayCreate(parent, name);
        if (err) {
          throw new FS.ErrnoError(err);
        }
        if (!parent.node_ops.mknod) {
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        }
        return parent.node_ops.mknod(parent, name, mode, dev);
      },create:function (path, mode) {
        mode = mode !== undefined ? mode : 438 /* 0666 */;
        mode &= 4095;
        mode |= 32768;
        return FS.mknod(path, mode, 0);
      },mkdir:function (path, mode) {
        mode = mode !== undefined ? mode : 511 /* 0777 */;
        mode &= 511 | 512;
        mode |= 16384;
        return FS.mknod(path, mode, 0);
      },mkdirTree:function (path, mode) {
        var dirs = path.split('/');
        var d = '';
        for (var i = 0; i < dirs.length; ++i) {
          if (!dirs[i]) continue;
          d += '/' + dirs[i];
          try {
            FS.mkdir(d, mode);
          } catch(e) {
            if (e.errno != ERRNO_CODES.EEXIST) throw e;
          }
        }
      },mkdev:function (path, mode, dev) {
        if (typeof(dev) === 'undefined') {
          dev = mode;
          mode = 438 /* 0666 */;
        }
        mode |= 8192;
        return FS.mknod(path, mode, dev);
      },symlink:function (oldpath, newpath) {
        if (!PATH.resolve(oldpath)) {
          throw new FS.ErrnoError(ERRNO_CODES.ENOENT);
        }
        var lookup = FS.lookupPath(newpath, { parent: true });
        var parent = lookup.node;
        if (!parent) {
          throw new FS.ErrnoError(ERRNO_CODES.ENOENT);
        }
        var newname = PATH.basename(newpath);
        var err = FS.mayCreate(parent, newname);
        if (err) {
          throw new FS.ErrnoError(err);
        }
        if (!parent.node_ops.symlink) {
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        }
        return parent.node_ops.symlink(parent, newname, oldpath);
      },rename:function (old_path, new_path) {
        var old_dirname = PATH.dirname(old_path);
        var new_dirname = PATH.dirname(new_path);
        var old_name = PATH.basename(old_path);
        var new_name = PATH.basename(new_path);
        // parents must exist
        var lookup, old_dir, new_dir;
        try {
          lookup = FS.lookupPath(old_path, { parent: true });
          old_dir = lookup.node;
          lookup = FS.lookupPath(new_path, { parent: true });
          new_dir = lookup.node;
        } catch (e) {
          throw new FS.ErrnoError(ERRNO_CODES.EBUSY);
        }
        if (!old_dir || !new_dir) throw new FS.ErrnoError(ERRNO_CODES.ENOENT);
        // need to be part of the same mount
        if (old_dir.mount !== new_dir.mount) {
          throw new FS.ErrnoError(ERRNO_CODES.EXDEV);
        }
        // source must exist
        var old_node = FS.lookupNode(old_dir, old_name);
        // old path should not be an ancestor of the new path
        var relative = PATH.relative(old_path, new_dirname);
        if (relative.charAt(0) !== '.') {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        // new path should not be an ancestor of the old path
        relative = PATH.relative(new_path, old_dirname);
        if (relative.charAt(0) !== '.') {
          throw new FS.ErrnoError(ERRNO_CODES.ENOTEMPTY);
        }
        // see if the new path already exists
        var new_node;
        try {
          new_node = FS.lookupNode(new_dir, new_name);
        } catch (e) {
          // not fatal
        }
        // early out if nothing needs to change
        if (old_node === new_node) {
          return;
        }
        // we'll need to delete the old entry
        var isdir = FS.isDir(old_node.mode);
        var err = FS.mayDelete(old_dir, old_name, isdir);
        if (err) {
          throw new FS.ErrnoError(err);
        }
        // need delete permissions if we'll be overwriting.
        // need create permissions if new doesn't already exist.
        err = new_node ?
          FS.mayDelete(new_dir, new_name, isdir) :
          FS.mayCreate(new_dir, new_name);
        if (err) {
          throw new FS.ErrnoError(err);
        }
        if (!old_dir.node_ops.rename) {
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        }
        if (FS.isMountpoint(old_node) || (new_node && FS.isMountpoint(new_node))) {
          throw new FS.ErrnoError(ERRNO_CODES.EBUSY);
        }
        // if we are going to change the parent, check write permissions
        if (new_dir !== old_dir) {
          err = FS.nodePermissions(old_dir, 'w');
          if (err) {
            throw new FS.ErrnoError(err);
          }
        }
        try {
          if (FS.trackingDelegate['willMovePath']) {
            FS.trackingDelegate['willMovePath'](old_path, new_path);
          }
        } catch(e) {
          console.log("FS.trackingDelegate['willMovePath']('"+old_path+"', '"+new_path+"') threw an exception: " + e.message);
        }
        // remove the node from the lookup hash
        FS.hashRemoveNode(old_node);
        // do the underlying fs rename
        try {
          old_dir.node_ops.rename(old_node, new_dir, new_name);
        } catch (e) {
          throw e;
        } finally {
          // add the node back to the hash (in case node_ops.rename
          // changed its name)
          FS.hashAddNode(old_node);
        }
        try {
          if (FS.trackingDelegate['onMovePath']) FS.trackingDelegate['onMovePath'](old_path, new_path);
        } catch(e) {
          console.log("FS.trackingDelegate['onMovePath']('"+old_path+"', '"+new_path+"') threw an exception: " + e.message);
        }
      },rmdir:function (path) {
        var lookup = FS.lookupPath(path, { parent: true });
        var parent = lookup.node;
        var name = PATH.basename(path);
        var node = FS.lookupNode(parent, name);
        var err = FS.mayDelete(parent, name, true);
        if (err) {
          throw new FS.ErrnoError(err);
        }
        if (!parent.node_ops.rmdir) {
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        }
        if (FS.isMountpoint(node)) {
          throw new FS.ErrnoError(ERRNO_CODES.EBUSY);
        }
        try {
          if (FS.trackingDelegate['willDeletePath']) {
            FS.trackingDelegate['willDeletePath'](path);
          }
        } catch(e) {
          console.log("FS.trackingDelegate['willDeletePath']('"+path+"') threw an exception: " + e.message);
        }
        parent.node_ops.rmdir(parent, name);
        FS.destroyNode(node);
        try {
          if (FS.trackingDelegate['onDeletePath']) FS.trackingDelegate['onDeletePath'](path);
        } catch(e) {
          console.log("FS.trackingDelegate['onDeletePath']('"+path+"') threw an exception: " + e.message);
        }
      },readdir:function (path) {
        var lookup = FS.lookupPath(path, { follow: true });
        var node = lookup.node;
        if (!node.node_ops.readdir) {
          throw new FS.ErrnoError(ERRNO_CODES.ENOTDIR);
        }
        return node.node_ops.readdir(node);
      },unlink:function (path) {
        var lookup = FS.lookupPath(path, { parent: true });
        var parent = lookup.node;
        var name = PATH.basename(path);
        var node = FS.lookupNode(parent, name);
        var err = FS.mayDelete(parent, name, false);
        if (err) {
          // According to POSIX, we should map EISDIR to EPERM, but
          // we instead do what Linux does (and we must, as we use
          // the musl linux libc).
          throw new FS.ErrnoError(err);
        }
        if (!parent.node_ops.unlink) {
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        }
        if (FS.isMountpoint(node)) {
          throw new FS.ErrnoError(ERRNO_CODES.EBUSY);
        }
        try {
          if (FS.trackingDelegate['willDeletePath']) {
            FS.trackingDelegate['willDeletePath'](path);
          }
        } catch(e) {
          console.log("FS.trackingDelegate['willDeletePath']('"+path+"') threw an exception: " + e.message);
        }
        parent.node_ops.unlink(parent, name);
        FS.destroyNode(node);
        try {
          if (FS.trackingDelegate['onDeletePath']) FS.trackingDelegate['onDeletePath'](path);
        } catch(e) {
          console.log("FS.trackingDelegate['onDeletePath']('"+path+"') threw an exception: " + e.message);
        }
      },readlink:function (path) {
        var lookup = FS.lookupPath(path);
        var link = lookup.node;
        if (!link) {
          throw new FS.ErrnoError(ERRNO_CODES.ENOENT);
        }
        if (!link.node_ops.readlink) {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        return PATH.resolve(FS.getPath(link.parent), link.node_ops.readlink(link));
      },stat:function (path, dontFollow) {
        var lookup = FS.lookupPath(path, { follow: !dontFollow });
        var node = lookup.node;
        if (!node) {
          throw new FS.ErrnoError(ERRNO_CODES.ENOENT);
        }
        if (!node.node_ops.getattr) {
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        }
        return node.node_ops.getattr(node);
      },lstat:function (path) {
        return FS.stat(path, true);
      },chmod:function (path, mode, dontFollow) {
        var node;
        if (typeof path === 'string') {
          var lookup = FS.lookupPath(path, { follow: !dontFollow });
          node = lookup.node;
        } else {
          node = path;
        }
        if (!node.node_ops.setattr) {
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        }
        node.node_ops.setattr(node, {
          mode: (mode & 4095) | (node.mode & ~4095),
          timestamp: Date.now()
        });
      },lchmod:function (path, mode) {
        FS.chmod(path, mode, true);
      },fchmod:function (fd, mode) {
        var stream = FS.getStream(fd);
        if (!stream) {
          throw new FS.ErrnoError(ERRNO_CODES.EBADF);
        }
        FS.chmod(stream.node, mode);
      },chown:function (path, uid, gid, dontFollow) {
        var node;
        if (typeof path === 'string') {
          var lookup = FS.lookupPath(path, { follow: !dontFollow });
          node = lookup.node;
        } else {
          node = path;
        }
        if (!node.node_ops.setattr) {
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        }
        node.node_ops.setattr(node, {
          timestamp: Date.now()
          // we ignore the uid / gid for now
        });
      },lchown:function (path, uid, gid) {
        FS.chown(path, uid, gid, true);
      },fchown:function (fd, uid, gid) {
        var stream = FS.getStream(fd);
        if (!stream) {
          throw new FS.ErrnoError(ERRNO_CODES.EBADF);
        }
        FS.chown(stream.node, uid, gid);
      },truncate:function (path, len) {
        if (len < 0) {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        var node;
        if (typeof path === 'string') {
          var lookup = FS.lookupPath(path, { follow: true });
          node = lookup.node;
        } else {
          node = path;
        }
        if (!node.node_ops.setattr) {
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        }
        if (FS.isDir(node.mode)) {
          throw new FS.ErrnoError(ERRNO_CODES.EISDIR);
        }
        if (!FS.isFile(node.mode)) {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        var err = FS.nodePermissions(node, 'w');
        if (err) {
          throw new FS.ErrnoError(err);
        }
        node.node_ops.setattr(node, {
          size: len,
          timestamp: Date.now()
        });
      },ftruncate:function (fd, len) {
        var stream = FS.getStream(fd);
        if (!stream) {
          throw new FS.ErrnoError(ERRNO_CODES.EBADF);
        }
        if ((stream.flags & 2097155) === 0) {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        FS.truncate(stream.node, len);
      },utime:function (path, atime, mtime) {
        var lookup = FS.lookupPath(path, { follow: true });
        var node = lookup.node;
        node.node_ops.setattr(node, {
          timestamp: Math.max(atime, mtime)
        });
      },open:function (path, flags, mode, fd_start, fd_end) {
        if (path === "") {
          throw new FS.ErrnoError(ERRNO_CODES.ENOENT);
        }
        flags = typeof flags === 'string' ? FS.modeStringToFlags(flags) : flags;
        mode = typeof mode === 'undefined' ? 438 /* 0666 */ : mode;
        if ((flags & 64)) {
          mode = (mode & 4095) | 32768;
        } else {
          mode = 0;
        }
        var node;
        if (typeof path === 'object') {
          node = path;
        } else {
          path = PATH.normalize(path);
          try {
            var lookup = FS.lookupPath(path, {
              follow: !(flags & 131072)
            });
            node = lookup.node;
          } catch (e) {
            // ignore
          }
        }
        // perhaps we need to create the node
        var created = false;
        if ((flags & 64)) {
          if (node) {
            // if O_CREAT and O_EXCL are set, error out if the node already exists
            if ((flags & 128)) {
              throw new FS.ErrnoError(ERRNO_CODES.EEXIST);
            }
          } else {
            // node doesn't exist, try to create it
            node = FS.mknod(path, mode, 0);
            created = true;
          }
        }
        if (!node) {
          throw new FS.ErrnoError(ERRNO_CODES.ENOENT);
        }
        // can't truncate a device
        if (FS.isChrdev(node.mode)) {
          flags &= ~512;
        }
        // if asked only for a directory, then this must be one
        if ((flags & 65536) && !FS.isDir(node.mode)) {
          throw new FS.ErrnoError(ERRNO_CODES.ENOTDIR);
        }
        // check permissions, if this is not a file we just created now (it is ok to
        // create and write to a file with read-only permissions; it is read-only
        // for later use)
        if (!created) {
          var err = FS.mayOpen(node, flags);
          if (err) {
            throw new FS.ErrnoError(err);
          }
        }
        // do truncation if necessary
        if ((flags & 512)) {
          FS.truncate(node, 0);
        }
        // we've already handled these, don't pass down to the underlying vfs
        flags &= ~(128 | 512);

        // register the stream with the filesystem
        var stream = FS.createStream({
          node: node,
          path: FS.getPath(node),  // we want the absolute path to the node
          flags: flags,
          seekable: true,
          position: 0,
          stream_ops: node.stream_ops,
          // used by the file family libc calls (fopen, fwrite, ferror, etc.)
          ungotten: [],
          error: false
        }, fd_start, fd_end);
        // call the new stream's open function
        if (stream.stream_ops.open) {
          stream.stream_ops.open(stream);
        }
        if (Module['logReadFiles'] && !(flags & 1)) {
          if (!FS.readFiles) FS.readFiles = {};
          if (!(path in FS.readFiles)) {
            FS.readFiles[path] = 1;
            err('read file: ' + path);
          }
        }
        try {
          if (FS.trackingDelegate['onOpenFile']) {
            var trackingFlags = 0;
            if ((flags & 2097155) !== 1) {
              trackingFlags |= FS.tracking.openFlags.READ;
            }
            if ((flags & 2097155) !== 0) {
              trackingFlags |= FS.tracking.openFlags.WRITE;
            }
            FS.trackingDelegate['onOpenFile'](path, trackingFlags);
          }
        } catch(e) {
          console.log("FS.trackingDelegate['onOpenFile']('"+path+"', flags) threw an exception: " + e.message);
        }
        return stream;
      },close:function (stream) {
        if (FS.isClosed(stream)) {
          throw new FS.ErrnoError(ERRNO_CODES.EBADF);
        }
        if (stream.getdents) stream.getdents = null; // free readdir state
        try {
          if (stream.stream_ops.close) {
            stream.stream_ops.close(stream);
          }
        } catch (e) {
          throw e;
        } finally {
          FS.closeStream(stream.fd);
        }
        stream.fd = null;
      },isClosed:function (stream) {
        return stream.fd === null;
      },llseek:function (stream, offset, whence) {
        if (FS.isClosed(stream)) {
          throw new FS.ErrnoError(ERRNO_CODES.EBADF);
        }
        if (!stream.seekable || !stream.stream_ops.llseek) {
          throw new FS.ErrnoError(ERRNO_CODES.ESPIPE);
        }
        stream.position = stream.stream_ops.llseek(stream, offset, whence);
        stream.ungotten = [];
        return stream.position;
      },read:function (stream, buffer, offset, length, position) {
        if (length < 0 || position < 0) {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        if (FS.isClosed(stream)) {
          throw new FS.ErrnoError(ERRNO_CODES.EBADF);
        }
        if ((stream.flags & 2097155) === 1) {
          throw new FS.ErrnoError(ERRNO_CODES.EBADF);
        }
        if (FS.isDir(stream.node.mode)) {
          throw new FS.ErrnoError(ERRNO_CODES.EISDIR);
        }
        if (!stream.stream_ops.read) {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        var seeking = typeof position !== 'undefined';
        if (!seeking) {
          position = stream.position;
        } else if (!stream.seekable) {
          throw new FS.ErrnoError(ERRNO_CODES.ESPIPE);
        }
        var bytesRead = stream.stream_ops.read(stream, buffer, offset, length, position);
        if (!seeking) stream.position += bytesRead;
        return bytesRead;
      },write:function (stream, buffer, offset, length, position, canOwn) {
        if (length < 0 || position < 0) {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        if (FS.isClosed(stream)) {
          throw new FS.ErrnoError(ERRNO_CODES.EBADF);
        }
        if ((stream.flags & 2097155) === 0) {
          throw new FS.ErrnoError(ERRNO_CODES.EBADF);
        }
        if (FS.isDir(stream.node.mode)) {
          throw new FS.ErrnoError(ERRNO_CODES.EISDIR);
        }
        if (!stream.stream_ops.write) {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        if (stream.flags & 1024) {
          // seek to the end before writing in append mode
          FS.llseek(stream, 0, 2);
        }
        var seeking = typeof position !== 'undefined';
        if (!seeking) {
          position = stream.position;
        } else if (!stream.seekable) {
          throw new FS.ErrnoError(ERRNO_CODES.ESPIPE);
        }
        var bytesWritten = stream.stream_ops.write(stream, buffer, offset, length, position, canOwn);
        if (!seeking) stream.position += bytesWritten;
        try {
          if (stream.path && FS.trackingDelegate['onWriteToFile']) FS.trackingDelegate['onWriteToFile'](stream.path);
        } catch(e) {
          console.log("FS.trackingDelegate['onWriteToFile']('"+path+"') threw an exception: " + e.message);
        }
        return bytesWritten;
      },allocate:function (stream, offset, length) {
        if (FS.isClosed(stream)) {
          throw new FS.ErrnoError(ERRNO_CODES.EBADF);
        }
        if (offset < 0 || length <= 0) {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        if ((stream.flags & 2097155) === 0) {
          throw new FS.ErrnoError(ERRNO_CODES.EBADF);
        }
        if (!FS.isFile(stream.node.mode) && !FS.isDir(stream.node.mode)) {
          throw new FS.ErrnoError(ERRNO_CODES.ENODEV);
        }
        if (!stream.stream_ops.allocate) {
          throw new FS.ErrnoError(ERRNO_CODES.EOPNOTSUPP);
        }
        stream.stream_ops.allocate(stream, offset, length);
      },mmap:function (stream, buffer, offset, length, position, prot, flags) {
        // TODO if PROT is PROT_WRITE, make sure we have write access
        if ((stream.flags & 2097155) === 1) {
          throw new FS.ErrnoError(ERRNO_CODES.EACCES);
        }
        if (!stream.stream_ops.mmap) {
          throw new FS.ErrnoError(ERRNO_CODES.ENODEV);
        }
        return stream.stream_ops.mmap(stream, buffer, offset, length, position, prot, flags);
      },msync:function (stream, buffer, offset, length, mmapFlags) {
        if (!stream || !stream.stream_ops.msync) {
          return 0;
        }
        return stream.stream_ops.msync(stream, buffer, offset, length, mmapFlags);
      },munmap:function (stream) {
        return 0;
      },ioctl:function (stream, cmd, arg) {
        if (!stream.stream_ops.ioctl) {
          throw new FS.ErrnoError(ERRNO_CODES.ENOTTY);
        }
        return stream.stream_ops.ioctl(stream, cmd, arg);
      },readFile:function (path, opts) {
        opts = opts || {};
        opts.flags = opts.flags || 'r';
        opts.encoding = opts.encoding || 'binary';
        if (opts.encoding !== 'utf8' && opts.encoding !== 'binary') {
          throw new Error('Invalid encoding type "' + opts.encoding + '"');
        }
        var ret;
        var stream = FS.open(path, opts.flags);
        var stat = FS.stat(path);
        var length = stat.size;
        var buf = new Uint8Array(length);
        FS.read(stream, buf, 0, length, 0);
        if (opts.encoding === 'utf8') {
          ret = UTF8ArrayToString(buf, 0);
        } else if (opts.encoding === 'binary') {
          ret = buf;
        }
        FS.close(stream);
        return ret;
      },writeFile:function (path, data, opts) {
        opts = opts || {};
        opts.flags = opts.flags || 'w';
        var stream = FS.open(path, opts.flags, opts.mode);
        if (typeof data === 'string') {
          var buf = new Uint8Array(lengthBytesUTF8(data)+1);
          var actualNumBytes = stringToUTF8Array(data, buf, 0, buf.length);
          FS.write(stream, buf, 0, actualNumBytes, undefined, opts.canOwn);
        } else if (ArrayBuffer.isView(data)) {
          FS.write(stream, data, 0, data.byteLength, undefined, opts.canOwn);
        } else {
          throw new Error('Unsupported data type');
        }
        FS.close(stream);
      },cwd:function () {
        return FS.currentPath;
      },chdir:function (path) {
        var lookup = FS.lookupPath(path, { follow: true });
        if (lookup.node === null) {
          throw new FS.ErrnoError(ERRNO_CODES.ENOENT);
        }
        if (!FS.isDir(lookup.node.mode)) {
          throw new FS.ErrnoError(ERRNO_CODES.ENOTDIR);
        }
        var err = FS.nodePermissions(lookup.node, 'x');
        if (err) {
          throw new FS.ErrnoError(err);
        }
        FS.currentPath = lookup.path;
      },createDefaultDirectories:function () {
        FS.mkdir('/tmp');
        FS.mkdir('/home');
        FS.mkdir('/home/web_user');
      },createDefaultDevices:function () {
        // create /dev
        FS.mkdir('/dev');
        // setup /dev/null
        FS.registerDevice(FS.makedev(1, 3), {
          read: function() { return 0; },
          write: function(stream, buffer, offset, length, pos) { return length; }
        });
        FS.mkdev('/dev/null', FS.makedev(1, 3));
        // setup /dev/tty and /dev/tty1
        // stderr needs to print output using Module['printErr']
        // so we register a second tty just for it.
        TTY.register(FS.makedev(5, 0), TTY.default_tty_ops);
        TTY.register(FS.makedev(6, 0), TTY.default_tty1_ops);
        FS.mkdev('/dev/tty', FS.makedev(5, 0));
        FS.mkdev('/dev/tty1', FS.makedev(6, 0));
        // setup /dev/[u]random
        var random_device;
        if (typeof crypto !== 'undefined') {
          // for modern web browsers
          var randomBuffer = new Uint8Array(1);
          random_device = function() { crypto.getRandomValues(randomBuffer); return randomBuffer[0]; };
        } else if (ENVIRONMENT_IS_NODE) {
          // for nodejs
          random_device = function() { return require('crypto')['randomBytes'](1)[0]; };
        } else {
          // default for ES5 platforms
          random_device = function() { return (Math.random()*256)|0; };
        }
        FS.createDevice('/dev', 'random', random_device);
        FS.createDevice('/dev', 'urandom', random_device);
        // we're not going to emulate the actual shm device,
        // just create the tmp dirs that reside in it commonly
        FS.mkdir('/dev/shm');
        FS.mkdir('/dev/shm/tmp');
      },createSpecialDirectories:function () {
        // create /proc/self/fd which allows /proc/self/fd/6 => readlink gives the name of the stream for fd 6 (see test_unistd_ttyname)
        FS.mkdir('/proc');
        FS.mkdir('/proc/self');
        FS.mkdir('/proc/self/fd');
        FS.mount({
          mount: function() {
            var node = FS.createNode('/proc/self', 'fd', 16384 | 511 /* 0777 */, 73);
            node.node_ops = {
              lookup: function(parent, name) {
                var fd = +name;
                var stream = FS.getStream(fd);
                if (!stream) throw new FS.ErrnoError(ERRNO_CODES.EBADF);
                var ret = {
                  parent: null,
                  mount: { mountpoint: 'fake' },
                  node_ops: { readlink: function() { return stream.path } }
                };
                ret.parent = ret; // make it look like a simple root node
                return ret;
              }
            };
            return node;
          }
        }, {}, '/proc/self/fd');
      },createStandardStreams:function () {
        // TODO deprecate the old functionality of a single
        // input / output callback and that utilizes FS.createDevice
        // and instead require a unique set of stream ops

        // by default, we symlink the standard streams to the
        // default tty devices. however, if the standard streams
        // have been overwritten we create a unique device for
        // them instead.
        if (Module['stdin']) {
          FS.createDevice('/dev', 'stdin', Module['stdin']);
        } else {
          FS.symlink('/dev/tty', '/dev/stdin');
        }
        if (Module['stdout']) {
          FS.createDevice('/dev', 'stdout', null, Module['stdout']);
        } else {
          FS.symlink('/dev/tty', '/dev/stdout');
        }
        if (Module['stderr']) {
          FS.createDevice('/dev', 'stderr', null, Module['stderr']);
        } else {
          FS.symlink('/dev/tty1', '/dev/stderr');
        }

        // open default streams for the stdin, stdout and stderr devices
        var stdin = FS.open('/dev/stdin', 'r');
        assert(stdin.fd === 0, 'invalid handle for stdin (' + stdin.fd + ')');

        var stdout = FS.open('/dev/stdout', 'w');
        assert(stdout.fd === 1, 'invalid handle for stdout (' + stdout.fd + ')');

        var stderr = FS.open('/dev/stderr', 'w');
        assert(stderr.fd === 2, 'invalid handle for stderr (' + stderr.fd + ')');
      },ensureErrnoError:function () {
        if (FS.ErrnoError) return;
        FS.ErrnoError = function ErrnoError(errno, node) {
          //err(stackTrace()); // useful for debugging
          this.node = node;
          this.setErrno = function(errno) {
            this.errno = errno;
            for (var key in ERRNO_CODES) {
              if (ERRNO_CODES[key] === errno) {
                this.code = key;
                break;
              }
            }
          };
          this.setErrno(errno);
          this.message = ERRNO_MESSAGES[errno];
          // Node.js compatibility: assigning on this.stack fails on Node 4 (but fixed on Node 8)
          if (this.stack) Object.defineProperty(this, "stack", { value: (new Error).stack, writable: true });
        };
        FS.ErrnoError.prototype = new Error();
        FS.ErrnoError.prototype.constructor = FS.ErrnoError;
        // Some errors may happen quite a bit, to avoid overhead we reuse them (and suffer a lack of stack info)
        [ERRNO_CODES.ENOENT].forEach(function(code) {
          FS.genericErrors[code] = new FS.ErrnoError(code);
          FS.genericErrors[code].stack = '<generic error, no stack>';
        });
      },staticInit:function () {
        FS.ensureErrnoError();

        FS.nameTable = new Array(4096);

        FS.mount(MEMFS, {}, '/');

        FS.createDefaultDirectories();
        FS.createDefaultDevices();
        FS.createSpecialDirectories();

        FS.filesystems = {
          'MEMFS': MEMFS,
          'IDBFS': IDBFS,
          'NODEFS': NODEFS,
          'WORKERFS': WORKERFS,
        };
      },init:function (input, output, error) {
        assert(!FS.init.initialized, 'FS.init was previously called. If you want to initialize later with custom parameters, remove any earlier calls (note that one is automatically added to the generated code)');
        FS.init.initialized = true;

        FS.ensureErrnoError();

        // Allow Module.stdin etc. to provide defaults, if none explicitly passed to us here
        Module['stdin'] = input || Module['stdin'];
        Module['stdout'] = output || Module['stdout'];
        Module['stderr'] = error || Module['stderr'];

        FS.createStandardStreams();
      },quit:function () {
        FS.init.initialized = false;
        // force-flush all streams, so we get musl std streams printed out
        var fflush = Module['_fflush'];
        if (fflush) fflush(0);
        // close all of our streams
        for (var i = 0; i < FS.streams.length; i++) {
          var stream = FS.streams[i];
          if (!stream) {
            continue;
          }
          FS.close(stream);
        }
      },getMode:function (canRead, canWrite) {
        var mode = 0;
        if (canRead) mode |= 292 | 73;
        if (canWrite) mode |= 146;
        return mode;
      },joinPath:function (parts, forceRelative) {
        var path = PATH.join.apply(null, parts);
        if (forceRelative && path[0] == '/') path = path.substr(1);
        return path;
      },absolutePath:function (relative, base) {
        return PATH.resolve(base, relative);
      },standardizePath:function (path) {
        return PATH.normalize(path);
      },findObject:function (path, dontResolveLastLink) {
        var ret = FS.analyzePath(path, dontResolveLastLink);
        if (ret.exists) {
          return ret.object;
        } else {
          ___setErrNo(ret.error);
          return null;
        }
      },analyzePath:function (path, dontResolveLastLink) {
        // operate from within the context of the symlink's target
        try {
          var lookup = FS.lookupPath(path, { follow: !dontResolveLastLink });
          path = lookup.path;
        } catch (e) {
        }
        var ret = {
          isRoot: false, exists: false, error: 0, name: null, path: null, object: null,
          parentExists: false, parentPath: null, parentObject: null
        };
        try {
          var lookup = FS.lookupPath(path, { parent: true });
          ret.parentExists = true;
          ret.parentPath = lookup.path;
          ret.parentObject = lookup.node;
          ret.name = PATH.basename(path);
          lookup = FS.lookupPath(path, { follow: !dontResolveLastLink });
          ret.exists = true;
          ret.path = lookup.path;
          ret.object = lookup.node;
          ret.name = lookup.node.name;
          ret.isRoot = lookup.path === '/';
        } catch (e) {
          ret.error = e.errno;
        };
        return ret;
      },createFolder:function (parent, name, canRead, canWrite) {
        var path = PATH.join2(typeof parent === 'string' ? parent : FS.getPath(parent), name);
        var mode = FS.getMode(canRead, canWrite);
        return FS.mkdir(path, mode);
      },createPath:function (parent, path, canRead, canWrite) {
        parent = typeof parent === 'string' ? parent : FS.getPath(parent);
        var parts = path.split('/').reverse();
        while (parts.length) {
          var part = parts.pop();
          if (!part) continue;
          var current = PATH.join2(parent, part);
          try {
            FS.mkdir(current);
          } catch (e) {
            // ignore EEXIST
          }
          parent = current;
        }
        return current;
      },createFile:function (parent, name, properties, canRead, canWrite) {
        var path = PATH.join2(typeof parent === 'string' ? parent : FS.getPath(parent), name);
        var mode = FS.getMode(canRead, canWrite);
        return FS.create(path, mode);
      },createDataFile:function (parent, name, data, canRead, canWrite, canOwn) {
        var path = name ? PATH.join2(typeof parent === 'string' ? parent : FS.getPath(parent), name) : parent;
        var mode = FS.getMode(canRead, canWrite);
        var node = FS.create(path, mode);
        if (data) {
          if (typeof data === 'string') {
            var arr = new Array(data.length);
            for (var i = 0, len = data.length; i < len; ++i) arr[i] = data.charCodeAt(i);
            data = arr;
          }
          // make sure we can write to the file
          FS.chmod(node, mode | 146);
          var stream = FS.open(node, 'w');
          FS.write(stream, data, 0, data.length, 0, canOwn);
          FS.close(stream);
          FS.chmod(node, mode);
        }
        return node;
      },createDevice:function (parent, name, input, output) {
        var path = PATH.join2(typeof parent === 'string' ? parent : FS.getPath(parent), name);
        var mode = FS.getMode(!!input, !!output);
        if (!FS.createDevice.major) FS.createDevice.major = 64;
        var dev = FS.makedev(FS.createDevice.major++, 0);
        // Create a fake device that a set of stream ops to emulate
        // the old behavior.
        FS.registerDevice(dev, {
          open: function(stream) {
            stream.seekable = false;
          },
          close: function(stream) {
            // flush any pending line data
            if (output && output.buffer && output.buffer.length) {
              output(10);
            }
          },
          read: function(stream, buffer, offset, length, pos /* ignored */) {
            var bytesRead = 0;
            for (var i = 0; i < length; i++) {
              var result;
              try {
                result = input();
              } catch (e) {
                throw new FS.ErrnoError(ERRNO_CODES.EIO);
              }
              if (result === undefined && bytesRead === 0) {
                throw new FS.ErrnoError(ERRNO_CODES.EAGAIN);
              }
              if (result === null || result === undefined) break;
              bytesRead++;
              buffer[offset+i] = result;
            }
            if (bytesRead) {
              stream.node.timestamp = Date.now();
            }
            return bytesRead;
          },
          write: function(stream, buffer, offset, length, pos) {
            for (var i = 0; i < length; i++) {
              try {
                output(buffer[offset+i]);
              } catch (e) {
                throw new FS.ErrnoError(ERRNO_CODES.EIO);
              }
            }
            if (length) {
              stream.node.timestamp = Date.now();
            }
            return i;
          }
        });
        return FS.mkdev(path, mode, dev);
      },createLink:function (parent, name, target, canRead, canWrite) {
        var path = PATH.join2(typeof parent === 'string' ? parent : FS.getPath(parent), name);
        return FS.symlink(target, path);
      },forceLoadFile:function (obj) {
        if (obj.isDevice || obj.isFolder || obj.link || obj.contents) return true;
        var success = true;
        if (typeof XMLHttpRequest !== 'undefined') {
          throw new Error("Lazy loading should have been performed (contents set) in createLazyFile, but it was not. Lazy loading only works in web workers. Use --embed-file or --preload-file in emcc on the main thread.");
        } else if (Module['read']) {
          // Command-line.
          try {
            // WARNING: Can't read binary files in V8's d8 or tracemonkey's js, as
            //          read() will try to parse UTF8.
            obj.contents = intArrayFromString(Module['read'](obj.url), true);
            obj.usedBytes = obj.contents.length;
          } catch (e) {
            success = false;
          }
        } else {
          throw new Error('Cannot load without read() or XMLHttpRequest.');
        }
        if (!success) ___setErrNo(ERRNO_CODES.EIO);
        return success;
      },createLazyFile:function (parent, name, url, canRead, canWrite) {
        // Lazy chunked Uint8Array (implements get and length from Uint8Array). Actual getting is abstracted away for eventual reuse.
        function LazyUint8Array() {
          this.lengthKnown = false;
          this.chunks = []; // Loaded chunks. Index is the chunk number
        }
        LazyUint8Array.prototype.get = function LazyUint8Array_get(idx) {
          if (idx > this.length-1 || idx < 0) {
            return undefined;
          }
          var chunkOffset = idx % this.chunkSize;
          var chunkNum = (idx / this.chunkSize)|0;
          return this.getter(chunkNum)[chunkOffset];
        }
        LazyUint8Array.prototype.setDataGetter = function LazyUint8Array_setDataGetter(getter) {
          this.getter = getter;
        }
        LazyUint8Array.prototype.cacheLength = function LazyUint8Array_cacheLength() {
          // Find length
          var xhr = new XMLHttpRequest();
          xhr.open('HEAD', url, false);
          xhr.send(null);
          if (!(xhr.status >= 200 && xhr.status < 300 || xhr.status === 304)) throw new Error("Couldn't load " + url + ". Status: " + xhr.status);
          var datalength = Number(xhr.getResponseHeader("Content-length"));
          var header;
          var hasByteServing = (header = xhr.getResponseHeader("Accept-Ranges")) && header === "bytes";
          var usesGzip = (header = xhr.getResponseHeader("Content-Encoding")) && header === "gzip";

          var chunkSize = 1024*1024; // Chunk size in bytes

          if (!hasByteServing) chunkSize = datalength;

          // Function to get a range from the remote URL.
          var doXHR = (function(from, to) {
            if (from > to) throw new Error("invalid range (" + from + ", " + to + ") or no bytes requested!");
            if (to > datalength-1) throw new Error("only " + datalength + " bytes available! programmer error!");

            // TODO: Use mozResponseArrayBuffer, responseStream, etc. if available.
            var xhr = new XMLHttpRequest();
            xhr.open('GET', url, false);
            if (datalength !== chunkSize) xhr.setRequestHeader("Range", "bytes=" + from + "-" + to);

            // Some hints to the browser that we want binary data.
            if (typeof Uint8Array != 'undefined') xhr.responseType = 'arraybuffer';
            if (xhr.overrideMimeType) {
              xhr.overrideMimeType('text/plain; charset=x-user-defined');
            }

            xhr.send(null);
            if (!(xhr.status >= 200 && xhr.status < 300 || xhr.status === 304)) throw new Error("Couldn't load " + url + ". Status: " + xhr.status);
            if (xhr.response !== undefined) {
              return new Uint8Array(xhr.response || []);
            } else {
              return intArrayFromString(xhr.responseText || '', true);
            }
          });
          var lazyArray = this;
          lazyArray.setDataGetter(function(chunkNum) {
            var start = chunkNum * chunkSize;
            var end = (chunkNum+1) * chunkSize - 1; // including this byte
            end = Math.min(end, datalength-1); // if datalength-1 is selected, this is the last block
            if (typeof(lazyArray.chunks[chunkNum]) === "undefined") {
              lazyArray.chunks[chunkNum] = doXHR(start, end);
            }
            if (typeof(lazyArray.chunks[chunkNum]) === "undefined") throw new Error("doXHR failed!");
            return lazyArray.chunks[chunkNum];
          });

          if (usesGzip || !datalength) {
            // if the server uses gzip or doesn't supply the length, we have to download the whole file to get the (uncompressed) length
            chunkSize = datalength = 1; // this will force getter(0)/doXHR do download the whole file
            datalength = this.getter(0).length;
            chunkSize = datalength;
            console.log("LazyFiles on gzip forces download of the whole file when length is accessed");
          }

          this._length = datalength;
          this._chunkSize = chunkSize;
          this.lengthKnown = true;
        }
        if (typeof XMLHttpRequest !== 'undefined') {
          if (!ENVIRONMENT_IS_WORKER) throw 'Cannot do synchronous binary XHRs outside webworkers in modern browsers. Use --embed-file or --preload-file in emcc';
          var lazyArray = new LazyUint8Array();
          Object.defineProperties(lazyArray, {
            length: {
              get: function() {
                if(!this.lengthKnown) {
                  this.cacheLength();
                }
                return this._length;
              }
            },
            chunkSize: {
              get: function() {
                if(!this.lengthKnown) {
                  this.cacheLength();
                }
                return this._chunkSize;
              }
            }
          });

          var properties = { isDevice: false, contents: lazyArray };
        } else {
          var properties = { isDevice: false, url: url };
        }

        var node = FS.createFile(parent, name, properties, canRead, canWrite);
        // This is a total hack, but I want to get this lazy file code out of the
        // core of MEMFS. If we want to keep this lazy file concept I feel it should
        // be its own thin LAZYFS proxying calls to MEMFS.
        if (properties.contents) {
          node.contents = properties.contents;
        } else if (properties.url) {
          node.contents = null;
          node.url = properties.url;
        }
        // Add a function that defers querying the file size until it is asked the first time.
        Object.defineProperties(node, {
          usedBytes: {
            get: function() { return this.contents.length; }
          }
        });
        // override each stream op with one that tries to force load the lazy file first
        var stream_ops = {};
        var keys = Object.keys(node.stream_ops);
        keys.forEach(function(key) {
          var fn = node.stream_ops[key];
          stream_ops[key] = function forceLoadLazyFile() {
            if (!FS.forceLoadFile(node)) {
              throw new FS.ErrnoError(ERRNO_CODES.EIO);
            }
            return fn.apply(null, arguments);
          };
        });
        // use a custom read function
        stream_ops.read = function stream_ops_read(stream, buffer, offset, length, position) {
          if (!FS.forceLoadFile(node)) {
            throw new FS.ErrnoError(ERRNO_CODES.EIO);
          }
          var contents = stream.node.contents;
          if (position >= contents.length)
            return 0;
          var size = Math.min(contents.length - position, length);
          assert(size >= 0);
          if (contents.slice) { // normal array
            for (var i = 0; i < size; i++) {
              buffer[offset + i] = contents[position + i];
            }
          } else {
            for (var i = 0; i < size; i++) { // LazyUint8Array from sync binary XHR
              buffer[offset + i] = contents.get(position + i);
            }
          }
          return size;
        };
        node.stream_ops = stream_ops;
        return node;
      },createPreloadedFile:function (parent, name, url, canRead, canWrite, onload, onerror, dontCreateFile, canOwn, preFinish) {
        Browser.init(); // XXX perhaps this method should move onto Browser?
        // TODO we should allow people to just pass in a complete filename instead
        // of parent and name being that we just join them anyways
        var fullname = name ? PATH.resolve(PATH.join2(parent, name)) : parent;
        var dep = getUniqueRunDependency('cp ' + fullname); // might have several active requests for the same fullname
        function processData(byteArray) {
          function finish(byteArray) {
            if (preFinish) preFinish();
            if (!dontCreateFile) {
              FS.createDataFile(parent, name, byteArray, canRead, canWrite, canOwn);
            }
            if (onload) onload();
            removeRunDependency(dep);
          }
          var handled = false;
          Module['preloadPlugins'].forEach(function(plugin) {
            if (handled) return;
            if (plugin['canHandle'](fullname)) {
              plugin['handle'](byteArray, fullname, finish, function() {
                if (onerror) onerror();
                removeRunDependency(dep);
              });
              handled = true;
            }
          });
          if (!handled) finish(byteArray);
        }
        addRunDependency(dep);
        if (typeof url == 'string') {
          Browser.asyncLoad(url, function(byteArray) {
            processData(byteArray);
          }, onerror);
        } else {
          processData(url);
        }
      },indexedDB:function () {
        return window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;
      },DB_NAME:function () {
        return 'EM_FS_' + window.location.pathname;
      },DB_VERSION:20,DB_STORE_NAME:"FILE_DATA",saveFilesToDB:function (paths, onload, onerror) {
        onload = onload || function(){};
        onerror = onerror || function(){};
        var indexedDB = FS.indexedDB();
        try {
          var openRequest = indexedDB.open(FS.DB_NAME(), FS.DB_VERSION);
        } catch (e) {
          return onerror(e);
        }
        openRequest.onupgradeneeded = function openRequest_onupgradeneeded() {
          console.log('creating db');
          var db = openRequest.result;
          db.createObjectStore(FS.DB_STORE_NAME);
        };
        openRequest.onsuccess = function openRequest_onsuccess() {
          var db = openRequest.result;
          var transaction = db.transaction([FS.DB_STORE_NAME], 'readwrite');
          var files = transaction.objectStore(FS.DB_STORE_NAME);
          var ok = 0, fail = 0, total = paths.length;
          function finish() {
            if (fail == 0) onload(); else onerror();
          }
          paths.forEach(function(path) {
            var putRequest = files.put(FS.analyzePath(path).object.contents, path);
            putRequest.onsuccess = function putRequest_onsuccess() { ok++; if (ok + fail == total) finish() };
            putRequest.onerror = function putRequest_onerror() { fail++; if (ok + fail == total) finish() };
          });
          transaction.onerror = onerror;
        };
        openRequest.onerror = onerror;
      },loadFilesFromDB:function (paths, onload, onerror) {
        onload = onload || function(){};
        onerror = onerror || function(){};
        var indexedDB = FS.indexedDB();
        try {
          var openRequest = indexedDB.open(FS.DB_NAME(), FS.DB_VERSION);
        } catch (e) {
          return onerror(e);
        }
        openRequest.onupgradeneeded = onerror; // no database to load from
        openRequest.onsuccess = function openRequest_onsuccess() {
          var db = openRequest.result;
          try {
            var transaction = db.transaction([FS.DB_STORE_NAME], 'readonly');
          } catch(e) {
            onerror(e);
            return;
          }
          var files = transaction.objectStore(FS.DB_STORE_NAME);
          var ok = 0, fail = 0, total = paths.length;
          function finish() {
            if (fail == 0) onload(); else onerror();
          }
          paths.forEach(function(path) {
            var getRequest = files.get(path);
            getRequest.onsuccess = function getRequest_onsuccess() {
              if (FS.analyzePath(path).exists) {
                FS.unlink(path);
              }
              FS.createDataFile(PATH.dirname(path), PATH.basename(path), getRequest.result, true, true, true);
              ok++;
              if (ok + fail == total) finish();
            };
            getRequest.onerror = function getRequest_onerror() { fail++; if (ok + fail == total) finish() };
          });
          transaction.onerror = onerror;
        };
        openRequest.onerror = onerror;
      }};var SYSCALLS={DEFAULT_POLLMASK:5,mappings:{},umask:511,calculateAt:function (dirfd, path) {
        if (path[0] !== '/') {
          // relative path
          var dir;
          if (dirfd === -100) {
            dir = FS.cwd();
          } else {
            var dirstream = FS.getStream(dirfd);
            if (!dirstream) throw new FS.ErrnoError(ERRNO_CODES.EBADF);
            dir = dirstream.path;
          }
          path = PATH.join2(dir, path);
        }
        return path;
      },doStat:function (func, path, buf) {
        try {
          var stat = func(path);
        } catch (e) {
          if (e && e.node && PATH.normalize(path) !== PATH.normalize(FS.getPath(e.node))) {
            // an error occurred while trying to look up the path; we should just report ENOTDIR
            return -ERRNO_CODES.ENOTDIR;
          }
          throw e;
        }
        HEAP32[((buf)>>2)]=stat.dev;
        HEAP32[(((buf)+(4))>>2)]=0;
        HEAP32[(((buf)+(8))>>2)]=stat.ino;
        HEAP32[(((buf)+(12))>>2)]=stat.mode;
        HEAP32[(((buf)+(16))>>2)]=stat.nlink;
        HEAP32[(((buf)+(20))>>2)]=stat.uid;
        HEAP32[(((buf)+(24))>>2)]=stat.gid;
        HEAP32[(((buf)+(28))>>2)]=stat.rdev;
        HEAP32[(((buf)+(32))>>2)]=0;
        HEAP32[(((buf)+(36))>>2)]=stat.size;
        HEAP32[(((buf)+(40))>>2)]=4096;
        HEAP32[(((buf)+(44))>>2)]=stat.blocks;
        HEAP32[(((buf)+(48))>>2)]=(stat.atime.getTime() / 1000)|0;
        HEAP32[(((buf)+(52))>>2)]=0;
        HEAP32[(((buf)+(56))>>2)]=(stat.mtime.getTime() / 1000)|0;
        HEAP32[(((buf)+(60))>>2)]=0;
        HEAP32[(((buf)+(64))>>2)]=(stat.ctime.getTime() / 1000)|0;
        HEAP32[(((buf)+(68))>>2)]=0;
        HEAP32[(((buf)+(72))>>2)]=stat.ino;
        return 0;
      },doMsync:function (addr, stream, len, flags) {
        var buffer = new Uint8Array(HEAPU8.subarray(addr, addr + len));
        FS.msync(stream, buffer, 0, len, flags);
      },doMkdir:function (path, mode) {
        // remove a trailing slash, if one - /a/b/ has basename of '', but
        // we want to create b in the context of this function
        path = PATH.normalize(path);
        if (path[path.length-1] === '/') path = path.substr(0, path.length-1);
        FS.mkdir(path, mode, 0);
        return 0;
      },doMknod:function (path, mode, dev) {
        // we don't want this in the JS API as it uses mknod to create all nodes.
        switch (mode & 61440) {
          case 32768:
          case 8192:
          case 24576:
          case 4096:
          case 49152:
            break;
          default: return -ERRNO_CODES.EINVAL;
        }
        FS.mknod(path, mode, dev);
        return 0;
      },doReadlink:function (path, buf, bufsize) {
        if (bufsize <= 0) return -ERRNO_CODES.EINVAL;
        var ret = FS.readlink(path);

        var len = Math.min(bufsize, lengthBytesUTF8(ret));
        var endChar = HEAP8[buf+len];
        stringToUTF8(ret, buf, bufsize+1);
        // readlink is one of the rare functions that write out a C string, but does never append a null to the output buffer(!)
        // stringToUTF8() always appends a null byte, so restore the character under the null byte after the write.
        HEAP8[buf+len] = endChar;

        return len;
      },doAccess:function (path, amode) {
        if (amode & ~7) {
          // need a valid mode
          return -ERRNO_CODES.EINVAL;
        }
        var node;
        var lookup = FS.lookupPath(path, { follow: true });
        node = lookup.node;
        var perms = '';
        if (amode & 4) perms += 'r';
        if (amode & 2) perms += 'w';
        if (amode & 1) perms += 'x';
        if (perms /* otherwise, they've just passed F_OK */ && FS.nodePermissions(node, perms)) {
          return -ERRNO_CODES.EACCES;
        }
        return 0;
      },doDup:function (path, flags, suggestFD) {
        var suggest = FS.getStream(suggestFD);
        if (suggest) FS.close(suggest);
        return FS.open(path, flags, 0, suggestFD, suggestFD).fd;
      },doReadv:function (stream, iov, iovcnt, offset) {
        var ret = 0;
        for (var i = 0; i < iovcnt; i++) {
          var ptr = HEAP32[(((iov)+(i*8))>>2)];
          var len = HEAP32[(((iov)+(i*8 + 4))>>2)];
          var curr = FS.read(stream, HEAP8,ptr, len, offset);
          if (curr < 0) return -1;
          ret += curr;
          if (curr < len) break; // nothing more to read
        }
        return ret;
      },doWritev:function (stream, iov, iovcnt, offset) {
        var ret = 0;
        for (var i = 0; i < iovcnt; i++) {
          var ptr = HEAP32[(((iov)+(i*8))>>2)];
          var len = HEAP32[(((iov)+(i*8 + 4))>>2)];
          var curr = FS.write(stream, HEAP8,ptr, len, offset);
          if (curr < 0) return -1;
          ret += curr;
        }
        return ret;
      },varargs:0,get:function (varargs) {
        SYSCALLS.varargs += 4;
        var ret = HEAP32[(((SYSCALLS.varargs)-(4))>>2)];
        return ret;
      },getStr:function () {
        var ret = Pointer_stringify(SYSCALLS.get());
        return ret;
      },getStreamFromFD:function () {
        var stream = FS.getStream(SYSCALLS.get());
        if (!stream) throw new FS.ErrnoError(ERRNO_CODES.EBADF);
        return stream;
      },getSocketFromFD:function () {
        var socket = SOCKFS.getSocket(SYSCALLS.get());
        if (!socket) throw new FS.ErrnoError(ERRNO_CODES.EBADF);
        return socket;
      },getSocketAddress:function (allowNull) {
        var addrp = SYSCALLS.get(), addrlen = SYSCALLS.get();
        if (allowNull && addrp === 0) return null;
        var info = __read_sockaddr(addrp, addrlen);
        if (info.errno) throw new FS.ErrnoError(info.errno);
        info.addr = DNS.lookup_addr(info.addr) || info.addr;
        return info;
      },get64:function () {
        var low = SYSCALLS.get(), high = SYSCALLS.get();
        if (low >= 0) assert(high === 0);
        else assert(high === -1);
        return low;
      },getZero:function () {
        assert(SYSCALLS.get() === 0);
      }};function ___syscall140(which, varargs) {SYSCALLS.varargs = varargs;
  try {
   // llseek
      var stream = SYSCALLS.getStreamFromFD(), offset_high = SYSCALLS.get(), offset_low = SYSCALLS.get(), result = SYSCALLS.get(), whence = SYSCALLS.get();
      // NOTE: offset_high is unused - Emscripten's off_t is 32-bit
      var offset = offset_low;
      FS.llseek(stream, offset, whence);
      HEAP32[((result)>>2)]=stream.position;
      if (stream.getdents && offset === 0 && whence === 0) stream.getdents = null; // reset readdir state
      return 0;
    } catch (e) {
    if (typeof FS === 'undefined' || !(e instanceof FS.ErrnoError)) abort(e);
    return -e.errno;
  }
  }

  function ___syscall146(which, varargs) {SYSCALLS.varargs = varargs;
  try {
   // writev
      var stream = SYSCALLS.getStreamFromFD(), iov = SYSCALLS.get(), iovcnt = SYSCALLS.get();
      return SYSCALLS.doWritev(stream, iov, iovcnt);
    } catch (e) {
    if (typeof FS === 'undefined' || !(e instanceof FS.ErrnoError)) abort(e);
    return -e.errno;
  }
  }

  function ___syscall6(which, varargs) {SYSCALLS.varargs = varargs;
  try {
   // close
      var stream = SYSCALLS.getStreamFromFD();
      FS.close(stream);
      return 0;
    } catch (e) {
    if (typeof FS === 'undefined' || !(e instanceof FS.ErrnoError)) abort(e);
    return -e.errno;
  }
  }

  function ___syscall91(which, varargs) {SYSCALLS.varargs = varargs;
  try {
   // munmap
      var addr = SYSCALLS.get(), len = SYSCALLS.get();
      // TODO: support unmmap'ing parts of allocations
      var info = SYSCALLS.mappings[addr];
      if (!info) return 0;
      if (len === info.len) {
        var stream = FS.getStream(info.fd);
        SYSCALLS.doMsync(addr, stream, len, info.flags)
        FS.munmap(stream);
        SYSCALLS.mappings[addr] = null;
        if (info.allocated) {
          _free(info.malloc);
        }
      }
      return 0;
    } catch (e) {
    if (typeof FS === 'undefined' || !(e instanceof FS.ErrnoError)) abort(e);
    return -e.errno;
  }
  }

  function ___unlock() {}


  function getShiftFromSize(size) {
      switch (size) {
          case 1: return 0;
          case 2: return 1;
          case 4: return 2;
          case 8: return 3;
          default:
              throw new TypeError('Unknown type size: ' + size);
      }
    }



  function embind_init_charCodes() {
      var codes = new Array(256);
      for (var i = 0; i < 256; ++i) {
          codes[i] = String.fromCharCode(i);
      }
      embind_charCodes = codes;
    }var embind_charCodes=undefined;function readLatin1String(ptr) {
      var ret = "";
      var c = ptr;
      while (HEAPU8[c]) {
          ret += embind_charCodes[HEAPU8[c++]];
      }
      return ret;
    }


  var awaitingDependencies={};

  var registeredTypes={};

  var typeDependencies={};






  var char_0=48;

  var char_9=57;function makeLegalFunctionName(name) {
      if (undefined === name) {
          return '_unknown';
      }
      name = name.replace(/[^a-zA-Z0-9_]/g, '$');
      var f = name.charCodeAt(0);
      if (f >= char_0 && f <= char_9) {
          return '_' + name;
      } else {
          return name;
      }
    }function createNamedFunction(name, body) {
      name = makeLegalFunctionName(name);
      /*jshint evil:true*/
      return new Function(
          "body",
          "return function " + name + "() {\n" +
          "    \"use strict\";" +
          "    return body.apply(this, arguments);\n" +
          "};\n"
      )(body);
    }function extendError(baseErrorType, errorName) {
      var errorClass = createNamedFunction(errorName, function(message) {
          this.name = errorName;
          this.message = message;

          var stack = (new Error(message)).stack;
          if (stack !== undefined) {
              this.stack = this.toString() + '\n' +
                  stack.replace(/^Error(:[^\n]*)?\n/, '');
          }
      });
      errorClass.prototype = Object.create(baseErrorType.prototype);
      errorClass.prototype.constructor = errorClass;
      errorClass.prototype.toString = function() {
          if (this.message === undefined) {
              return this.name;
          } else {
              return this.name + ': ' + this.message;
          }
      };

      return errorClass;
    }var BindingError=undefined;function throwBindingError(message) {
      throw new BindingError(message);
    }



  var InternalError=undefined;function throwInternalError(message) {
      throw new InternalError(message);
    }function whenDependentTypesAreResolved(myTypes, dependentTypes, getTypeConverters) {
      myTypes.forEach(function(type) {
          typeDependencies[type] = dependentTypes;
      });

      function onComplete(typeConverters) {
          var myTypeConverters = getTypeConverters(typeConverters);
          if (myTypeConverters.length !== myTypes.length) {
              throwInternalError('Mismatched type converter count');
          }
          for (var i = 0; i < myTypes.length; ++i) {
              registerType(myTypes[i], myTypeConverters[i]);
          }
      }

      var typeConverters = new Array(dependentTypes.length);
      var unregisteredTypes = [];
      var registered = 0;
      dependentTypes.forEach(function(dt, i) {
          if (registeredTypes.hasOwnProperty(dt)) {
              typeConverters[i] = registeredTypes[dt];
          } else {
              unregisteredTypes.push(dt);
              if (!awaitingDependencies.hasOwnProperty(dt)) {
                  awaitingDependencies[dt] = [];
              }
              awaitingDependencies[dt].push(function() {
                  typeConverters[i] = registeredTypes[dt];
                  ++registered;
                  if (registered === unregisteredTypes.length) {
                      onComplete(typeConverters);
                  }
              });
          }
      });
      if (0 === unregisteredTypes.length) {
          onComplete(typeConverters);
      }
    }function registerType(rawType, registeredInstance, options) {
      options = options || {};

      if (!('argPackAdvance' in registeredInstance)) {
          throw new TypeError('registerType registeredInstance requires argPackAdvance');
      }

      var name = registeredInstance.name;
      if (!rawType) {
          throwBindingError('type "' + name + '" must have a positive integer typeid pointer');
      }
      if (registeredTypes.hasOwnProperty(rawType)) {
          if (options.ignoreDuplicateRegistrations) {
              return;
          } else {
              throwBindingError("Cannot register type '" + name + "' twice");
          }
      }

      registeredTypes[rawType] = registeredInstance;
      delete typeDependencies[rawType];

      if (awaitingDependencies.hasOwnProperty(rawType)) {
          var callbacks = awaitingDependencies[rawType];
          delete awaitingDependencies[rawType];
          callbacks.forEach(function(cb) {
              cb();
          });
      }
    }function __embind_register_bool(rawType, name, size, trueValue, falseValue) {
      var shift = getShiftFromSize(size);

      name = readLatin1String(name);
      registerType(rawType, {
          name: name,
          'fromWireType': function(wt) {
              // ambiguous emscripten ABI: sometimes return values are
              // true or false, and sometimes integers (0 or 1)
              return !!wt;
          },
          'toWireType': function(destructors, o) {
              return o ? trueValue : falseValue;
          },
          'argPackAdvance': 8,
          'readValueFromPointer': function(pointer) {
              // TODO: if heap is fixed (like in asm.js) this could be executed outside
              var heap;
              if (size === 1) {
                  heap = HEAP8;
              } else if (size === 2) {
                  heap = HEAP16;
              } else if (size === 4) {
                  heap = HEAP32;
              } else {
                  throw new TypeError("Unknown boolean type size: " + name);
              }
              return this['fromWireType'](heap[pointer >> shift]);
          },
          destructorFunction: null, // This type does not need a destructor
      });
    }




  function ClassHandle_isAliasOf(other) {
      if (!(this instanceof ClassHandle)) {
          return false;
      }
      if (!(other instanceof ClassHandle)) {
          return false;
      }

      var leftClass = this.$$.ptrType.registeredClass;
      var left = this.$$.ptr;
      var rightClass = other.$$.ptrType.registeredClass;
      var right = other.$$.ptr;

      while (leftClass.baseClass) {
          left = leftClass.upcast(left);
          leftClass = leftClass.baseClass;
      }

      while (rightClass.baseClass) {
          right = rightClass.upcast(right);
          rightClass = rightClass.baseClass;
      }

      return leftClass === rightClass && left === right;
    }


  function shallowCopyInternalPointer(o) {
      return {
          count: o.count,
          deleteScheduled: o.deleteScheduled,
          preservePointerOnDelete: o.preservePointerOnDelete,
          ptr: o.ptr,
          ptrType: o.ptrType,
          smartPtr: o.smartPtr,
          smartPtrType: o.smartPtrType,
      };
    }

  function throwInstanceAlreadyDeleted(obj) {
      function getInstanceTypeName(handle) {
        return handle.$$.ptrType.registeredClass.name;
      }
      throwBindingError(getInstanceTypeName(obj) + ' instance already deleted');
    }function ClassHandle_clone() {
      if (!this.$$.ptr) {
          throwInstanceAlreadyDeleted(this);
      }

      if (this.$$.preservePointerOnDelete) {
          this.$$.count.value += 1;
          return this;
      } else {
          var clone = Object.create(Object.getPrototypeOf(this), {
              $$: {
                  value: shallowCopyInternalPointer(this.$$),
              }
          });

          clone.$$.count.value += 1;
          clone.$$.deleteScheduled = false;
          return clone;
      }
    }


  function runDestructor(handle) {
      var $$ = handle.$$;
      if ($$.smartPtr) {
          $$.smartPtrType.rawDestructor($$.smartPtr);
      } else {
          $$.ptrType.registeredClass.rawDestructor($$.ptr);
      }
    }function ClassHandle_delete() {
      if (!this.$$.ptr) {
          throwInstanceAlreadyDeleted(this);
      }

      if (this.$$.deleteScheduled && !this.$$.preservePointerOnDelete) {
          throwBindingError('Object already scheduled for deletion');
      }

      this.$$.count.value -= 1;
      var toDelete = 0 === this.$$.count.value;
      if (toDelete) {
          runDestructor(this);
      }
      if (!this.$$.preservePointerOnDelete) {
          this.$$.smartPtr = undefined;
          this.$$.ptr = undefined;
      }
    }

  function ClassHandle_isDeleted() {
      return !this.$$.ptr;
    }


  var delayFunction=undefined;

  var deletionQueue=[];

  function flushPendingDeletes() {
      while (deletionQueue.length) {
          var obj = deletionQueue.pop();
          obj.$$.deleteScheduled = false;
          obj['delete']();
      }
    }function ClassHandle_deleteLater() {
      if (!this.$$.ptr) {
          throwInstanceAlreadyDeleted(this);
      }
      if (this.$$.deleteScheduled && !this.$$.preservePointerOnDelete) {
          throwBindingError('Object already scheduled for deletion');
      }
      deletionQueue.push(this);
      if (deletionQueue.length === 1 && delayFunction) {
          delayFunction(flushPendingDeletes);
      }
      this.$$.deleteScheduled = true;
      return this;
    }function init_ClassHandle() {
      ClassHandle.prototype['isAliasOf'] = ClassHandle_isAliasOf;
      ClassHandle.prototype['clone'] = ClassHandle_clone;
      ClassHandle.prototype['delete'] = ClassHandle_delete;
      ClassHandle.prototype['isDeleted'] = ClassHandle_isDeleted;
      ClassHandle.prototype['deleteLater'] = ClassHandle_deleteLater;
    }function ClassHandle() {
    }

  var registeredPointers={};


  function ensureOverloadTable(proto, methodName, humanName) {
      if (undefined === proto[methodName].overloadTable) {
          var prevFunc = proto[methodName];
          // Inject an overload resolver function that routes to the appropriate overload based on the number of arguments.
          proto[methodName] = function() {
              // TODO This check can be removed in -O3 level "unsafe" optimizations.
              if (!proto[methodName].overloadTable.hasOwnProperty(arguments.length)) {
                  throwBindingError("Function '" + humanName + "' called with an invalid number of arguments (" + arguments.length + ") - expects one of (" + proto[methodName].overloadTable + ")!");
              }
              return proto[methodName].overloadTable[arguments.length].apply(this, arguments);
          };
          // Move the previous function into the overload table.
          proto[methodName].overloadTable = [];
          proto[methodName].overloadTable[prevFunc.argCount] = prevFunc;
      }
    }function exposePublicSymbol(name, value, numArguments) {
      if (Module.hasOwnProperty(name)) {
          if (undefined === numArguments || (undefined !== Module[name].overloadTable && undefined !== Module[name].overloadTable[numArguments])) {
              throwBindingError("Cannot register public name '" + name + "' twice");
          }

          // We are exposing a function with the same name as an existing function. Create an overload table and a function selector
          // that routes between the two.
          ensureOverloadTable(Module, name, name);
          if (Module.hasOwnProperty(numArguments)) {
              throwBindingError("Cannot register multiple overloads of a function with the same number of arguments (" + numArguments + ")!");
          }
          // Add the new function into the overload table.
          Module[name].overloadTable[numArguments] = value;
      }
      else {
          Module[name] = value;
          if (undefined !== numArguments) {
              Module[name].numArguments = numArguments;
          }
      }
    }

  function RegisteredClass(
      name,
      constructor,
      instancePrototype,
      rawDestructor,
      baseClass,
      getActualType,
      upcast,
      downcast
    ) {
      this.name = name;
      this.constructor = constructor;
      this.instancePrototype = instancePrototype;
      this.rawDestructor = rawDestructor;
      this.baseClass = baseClass;
      this.getActualType = getActualType;
      this.upcast = upcast;
      this.downcast = downcast;
      this.pureVirtualFunctions = [];
    }



  function upcastPointer(ptr, ptrClass, desiredClass) {
      while (ptrClass !== desiredClass) {
          if (!ptrClass.upcast) {
              throwBindingError("Expected null or instance of " + desiredClass.name + ", got an instance of " + ptrClass.name);
          }
          ptr = ptrClass.upcast(ptr);
          ptrClass = ptrClass.baseClass;
      }
      return ptr;
    }function constNoSmartPtrRawPointerToWireType(destructors, handle) {
      if (handle === null) {
          if (this.isReference) {
              throwBindingError('null is not a valid ' + this.name);
          }
          return 0;
      }

      if (!handle.$$) {
          throwBindingError('Cannot pass "' + _embind_repr(handle) + '" as a ' + this.name);
      }
      if (!handle.$$.ptr) {
          throwBindingError('Cannot pass deleted object as a pointer of type ' + this.name);
      }
      var handleClass = handle.$$.ptrType.registeredClass;
      var ptr = upcastPointer(handle.$$.ptr, handleClass, this.registeredClass);
      return ptr;
    }

  function genericPointerToWireType(destructors, handle) {
      var ptr;
      if (handle === null) {
          if (this.isReference) {
              throwBindingError('null is not a valid ' + this.name);
          }

          if (this.isSmartPointer) {
              ptr = this.rawConstructor();
              if (destructors !== null) {
                  destructors.push(this.rawDestructor, ptr);
              }
              return ptr;
          } else {
              return 0;
          }
      }

      if (!handle.$$) {
          throwBindingError('Cannot pass "' + _embind_repr(handle) + '" as a ' + this.name);
      }
      if (!handle.$$.ptr) {
          throwBindingError('Cannot pass deleted object as a pointer of type ' + this.name);
      }
      if (!this.isConst && handle.$$.ptrType.isConst) {
          throwBindingError('Cannot convert argument of type ' + (handle.$$.smartPtrType ? handle.$$.smartPtrType.name : handle.$$.ptrType.name) + ' to parameter type ' + this.name);
      }
      var handleClass = handle.$$.ptrType.registeredClass;
      ptr = upcastPointer(handle.$$.ptr, handleClass, this.registeredClass);

      if (this.isSmartPointer) {
          // TODO: this is not strictly true
          // We could support BY_EMVAL conversions from raw pointers to smart pointers
          // because the smart pointer can hold a reference to the handle
          if (undefined === handle.$$.smartPtr) {
              throwBindingError('Passing raw pointer to smart pointer is illegal');
          }

          switch (this.sharingPolicy) {
              case 0: // NONE
                  // no upcasting
                  if (handle.$$.smartPtrType === this) {
                      ptr = handle.$$.smartPtr;
                  } else {
                      throwBindingError('Cannot convert argument of type ' + (handle.$$.smartPtrType ? handle.$$.smartPtrType.name : handle.$$.ptrType.name) + ' to parameter type ' + this.name);
                  }
                  break;

              case 1: // INTRUSIVE
                  ptr = handle.$$.smartPtr;
                  break;

              case 2: // BY_EMVAL
                  if (handle.$$.smartPtrType === this) {
                      ptr = handle.$$.smartPtr;
                  } else {
                      var clonedHandle = handle['clone']();
                      ptr = this.rawShare(
                          ptr,
                          __emval_register(function() {
                              clonedHandle['delete']();
                          })
                      );
                      if (destructors !== null) {
                          destructors.push(this.rawDestructor, ptr);
                      }
                  }
                  break;

              default:
                  throwBindingError('Unsupporting sharing policy');
          }
      }
      return ptr;
    }

  function nonConstNoSmartPtrRawPointerToWireType(destructors, handle) {
      if (handle === null) {
          if (this.isReference) {
              throwBindingError('null is not a valid ' + this.name);
          }
          return 0;
      }

      if (!handle.$$) {
          throwBindingError('Cannot pass "' + _embind_repr(handle) + '" as a ' + this.name);
      }
      if (!handle.$$.ptr) {
          throwBindingError('Cannot pass deleted object as a pointer of type ' + this.name);
      }
      if (handle.$$.ptrType.isConst) {
          throwBindingError('Cannot convert argument of type ' + handle.$$.ptrType.name + ' to parameter type ' + this.name);
      }
      var handleClass = handle.$$.ptrType.registeredClass;
      var ptr = upcastPointer(handle.$$.ptr, handleClass, this.registeredClass);
      return ptr;
    }


  function simpleReadValueFromPointer(pointer) {
      return this['fromWireType'](HEAPU32[pointer >> 2]);
    }

  function RegisteredPointer_getPointee(ptr) {
      if (this.rawGetPointee) {
          ptr = this.rawGetPointee(ptr);
      }
      return ptr;
    }

  function RegisteredPointer_destructor(ptr) {
      if (this.rawDestructor) {
          this.rawDestructor(ptr);
      }
    }

  function RegisteredPointer_deleteObject(handle) {
      if (handle !== null) {
          handle['delete']();
      }
    }


  function downcastPointer(ptr, ptrClass, desiredClass) {
      if (ptrClass === desiredClass) {
          return ptr;
      }
      if (undefined === desiredClass.baseClass) {
          return null; // no conversion
      }

      var rv = downcastPointer(ptr, ptrClass, desiredClass.baseClass);
      if (rv === null) {
          return null;
      }
      return desiredClass.downcast(rv);
    }




  function getInheritedInstanceCount() {
      return Object.keys(registeredInstances).length;
    }

  function getLiveInheritedInstances() {
      var rv = [];
      for (var k in registeredInstances) {
          if (registeredInstances.hasOwnProperty(k)) {
              rv.push(registeredInstances[k]);
          }
      }
      return rv;
    }

  function setDelayFunction(fn) {
      delayFunction = fn;
      if (deletionQueue.length && delayFunction) {
          delayFunction(flushPendingDeletes);
      }
    }function init_embind() {
      Module['getInheritedInstanceCount'] = getInheritedInstanceCount;
      Module['getLiveInheritedInstances'] = getLiveInheritedInstances;
      Module['flushPendingDeletes'] = flushPendingDeletes;
      Module['setDelayFunction'] = setDelayFunction;
    }var registeredInstances={};

  function getBasestPointer(class_, ptr) {
      if (ptr === undefined) {
          throwBindingError('ptr should not be undefined');
      }
      while (class_.baseClass) {
          ptr = class_.upcast(ptr);
          class_ = class_.baseClass;
      }
      return ptr;
    }function getInheritedInstance(class_, ptr) {
      ptr = getBasestPointer(class_, ptr);
      return registeredInstances[ptr];
    }

  function makeClassHandle(prototype, record) {
      if (!record.ptrType || !record.ptr) {
          throwInternalError('makeClassHandle requires ptr and ptrType');
      }
      var hasSmartPtrType = !!record.smartPtrType;
      var hasSmartPtr = !!record.smartPtr;
      if (hasSmartPtrType !== hasSmartPtr) {
          throwInternalError('Both smartPtrType and smartPtr must be specified');
      }
      record.count = { value: 1 };
      return Object.create(prototype, {
          $$: {
              value: record,
          },
      });
    }function RegisteredPointer_fromWireType(ptr) {
      // ptr is a raw pointer (or a raw smartpointer)

      // rawPointer is a maybe-null raw pointer
      var rawPointer = this.getPointee(ptr);
      if (!rawPointer) {
          this.destructor(ptr);
          return null;
      }

      var registeredInstance = getInheritedInstance(this.registeredClass, rawPointer);
      if (undefined !== registeredInstance) {
          // JS object has been neutered, time to repopulate it
          if (0 === registeredInstance.$$.count.value) {
              registeredInstance.$$.ptr = rawPointer;
              registeredInstance.$$.smartPtr = ptr;
              return registeredInstance['clone']();
          } else {
              // else, just increment reference count on existing object
              // it already has a reference to the smart pointer
              var rv = registeredInstance['clone']();
              this.destructor(ptr);
              return rv;
          }
      }

      function makeDefaultHandle() {
          if (this.isSmartPointer) {
              return makeClassHandle(this.registeredClass.instancePrototype, {
                  ptrType: this.pointeeType,
                  ptr: rawPointer,
                  smartPtrType: this,
                  smartPtr: ptr,
              });
          } else {
              return makeClassHandle(this.registeredClass.instancePrototype, {
                  ptrType: this,
                  ptr: ptr,
              });
          }
      }

      var actualType = this.registeredClass.getActualType(rawPointer);
      var registeredPointerRecord = registeredPointers[actualType];
      if (!registeredPointerRecord) {
          return makeDefaultHandle.call(this);
      }

      var toType;
      if (this.isConst) {
          toType = registeredPointerRecord.constPointerType;
      } else {
          toType = registeredPointerRecord.pointerType;
      }
      var dp = downcastPointer(
          rawPointer,
          this.registeredClass,
          toType.registeredClass);
      if (dp === null) {
          return makeDefaultHandle.call(this);
      }
      if (this.isSmartPointer) {
          return makeClassHandle(toType.registeredClass.instancePrototype, {
              ptrType: toType,
              ptr: dp,
              smartPtrType: this,
              smartPtr: ptr,
          });
      } else {
          return makeClassHandle(toType.registeredClass.instancePrototype, {
              ptrType: toType,
              ptr: dp,
          });
      }
    }function init_RegisteredPointer() {
      RegisteredPointer.prototype.getPointee = RegisteredPointer_getPointee;
      RegisteredPointer.prototype.destructor = RegisteredPointer_destructor;
      RegisteredPointer.prototype['argPackAdvance'] = 8;
      RegisteredPointer.prototype['readValueFromPointer'] = simpleReadValueFromPointer;
      RegisteredPointer.prototype['deleteObject'] = RegisteredPointer_deleteObject;
      RegisteredPointer.prototype['fromWireType'] = RegisteredPointer_fromWireType;
    }function RegisteredPointer(
      name,
      registeredClass,
      isReference,
      isConst,

      // smart pointer properties
      isSmartPointer,
      pointeeType,
      sharingPolicy,
      rawGetPointee,
      rawConstructor,
      rawShare,
      rawDestructor
    ) {
      this.name = name;
      this.registeredClass = registeredClass;
      this.isReference = isReference;
      this.isConst = isConst;

      // smart pointer properties
      this.isSmartPointer = isSmartPointer;
      this.pointeeType = pointeeType;
      this.sharingPolicy = sharingPolicy;
      this.rawGetPointee = rawGetPointee;
      this.rawConstructor = rawConstructor;
      this.rawShare = rawShare;
      this.rawDestructor = rawDestructor;

      if (!isSmartPointer && registeredClass.baseClass === undefined) {
          if (isConst) {
              this['toWireType'] = constNoSmartPtrRawPointerToWireType;
              this.destructorFunction = null;
          } else {
              this['toWireType'] = nonConstNoSmartPtrRawPointerToWireType;
              this.destructorFunction = null;
          }
      } else {
          this['toWireType'] = genericPointerToWireType;
          // Here we must leave this.destructorFunction undefined, since whether genericPointerToWireType returns
          // a pointer that needs to be freed up is runtime-dependent, and cannot be evaluated at registration time.
          // TODO: Create an alternative mechanism that allows removing the use of var destructors = []; array in
          //       craftInvokerFunction altogether.
      }
    }

  function replacePublicSymbol(name, value, numArguments) {
      if (!Module.hasOwnProperty(name)) {
          throwInternalError('Replacing nonexistant public symbol');
      }
      // If there's an overload table for this symbol, replace the symbol in the overload table instead.
      if (undefined !== Module[name].overloadTable && undefined !== numArguments) {
          Module[name].overloadTable[numArguments] = value;
      }
      else {
          Module[name] = value;
          Module[name].argCount = numArguments;
      }
    }

  function embind__requireFunction(signature, rawFunction) {
      signature = readLatin1String(signature);

      function makeDynCaller(dynCall) {
          var args = [];
          for (var i = 1; i < signature.length; ++i) {
              args.push('a' + i);
          }

          var name = 'dynCall_' + signature + '_' + rawFunction;
          var body = 'return function ' + name + '(' + args.join(', ') + ') {\n';
          body    += '    return dynCall(rawFunction' + (args.length ? ', ' : '') + args.join(', ') + ');\n';
          body    += '};\n';

          return (new Function('dynCall', 'rawFunction', body))(dynCall, rawFunction);
      }

      var fp;
      if (Module['FUNCTION_TABLE_' + signature] !== undefined) {
          fp = Module['FUNCTION_TABLE_' + signature][rawFunction];
      } else if (typeof FUNCTION_TABLE !== "undefined") {
          fp = FUNCTION_TABLE[rawFunction];
      } else {
          // asm.js does not give direct access to the function tables,
          // and thus we must go through the dynCall interface which allows
          // calling into a signature's function table by pointer value.
          //
          // https://github.com/dherman/asm.js/issues/83
          //
          // This has three main penalties:
          // - dynCall is another function call in the path from JavaScript to C++.
          // - JITs may not predict through the function table indirection at runtime.
          var dc = Module["asm"]['dynCall_' + signature];
          if (dc === undefined) {
              // We will always enter this branch if the signature
              // contains 'f' and PRECISE_F32 is not enabled.
              //
              // Try again, replacing 'f' with 'd'.
              dc = Module["asm"]['dynCall_' + signature.replace(/f/g, 'd')];
              if (dc === undefined) {
                  throwBindingError("No dynCall invoker for signature: " + signature);
              }
          }
          fp = makeDynCaller(dc);
      }

      if (typeof fp !== "function") {
          throwBindingError("unknown function pointer with signature " + signature + ": " + rawFunction);
      }
      return fp;
    }


  var UnboundTypeError=undefined;

  function getTypeName(type) {
      var ptr = ___getTypeName(type);
      var rv = readLatin1String(ptr);
      _free(ptr);
      return rv;
    }function throwUnboundTypeError(message, types) {
      var unboundTypes = [];
      var seen = {};
      function visit(type) {
          if (seen[type]) {
              return;
          }
          if (registeredTypes[type]) {
              return;
          }
          if (typeDependencies[type]) {
              typeDependencies[type].forEach(visit);
              return;
          }
          unboundTypes.push(type);
          seen[type] = true;
      }
      types.forEach(visit);

      throw new UnboundTypeError(message + ': ' + unboundTypes.map(getTypeName).join([', ']));
    }function __embind_register_class(
      rawType,
      rawPointerType,
      rawConstPointerType,
      baseClassRawType,
      getActualTypeSignature,
      getActualType,
      upcastSignature,
      upcast,
      downcastSignature,
      downcast,
      name,
      destructorSignature,
      rawDestructor
    ) {
      name = readLatin1String(name);
      getActualType = embind__requireFunction(getActualTypeSignature, getActualType);
      if (upcast) {
          upcast = embind__requireFunction(upcastSignature, upcast);
      }
      if (downcast) {
          downcast = embind__requireFunction(downcastSignature, downcast);
      }
      rawDestructor = embind__requireFunction(destructorSignature, rawDestructor);
      var legalFunctionName = makeLegalFunctionName(name);

      exposePublicSymbol(legalFunctionName, function() {
          // this code cannot run if baseClassRawType is zero
          throwUnboundTypeError('Cannot construct ' + name + ' due to unbound types', [baseClassRawType]);
      });

      whenDependentTypesAreResolved(
          [rawType, rawPointerType, rawConstPointerType],
          baseClassRawType ? [baseClassRawType] : [],
          function(base) {
              base = base[0];

              var baseClass;
              var basePrototype;
              if (baseClassRawType) {
                  baseClass = base.registeredClass;
                  basePrototype = baseClass.instancePrototype;
              } else {
                  basePrototype = ClassHandle.prototype;
              }

              var constructor = createNamedFunction(legalFunctionName, function() {
                  if (Object.getPrototypeOf(this) !== instancePrototype) {
                      throw new BindingError("Use 'new' to construct " + name);
                  }
                  if (undefined === registeredClass.constructor_body) {
                      throw new BindingError(name + " has no accessible constructor");
                  }
                  var body = registeredClass.constructor_body[arguments.length];
                  if (undefined === body) {
                      throw new BindingError("Tried to invoke ctor of " + name + " with invalid number of parameters (" + arguments.length + ") - expected (" + Object.keys(registeredClass.constructor_body).toString() + ") parameters instead!");
                  }
                  return body.apply(this, arguments);
              });

              var instancePrototype = Object.create(basePrototype, {
                  constructor: { value: constructor },
              });

              constructor.prototype = instancePrototype;

              var registeredClass = new RegisteredClass(
                  name,
                  constructor,
                  instancePrototype,
                  rawDestructor,
                  baseClass,
                  getActualType,
                  upcast,
                  downcast);

              var referenceConverter = new RegisteredPointer(
                  name,
                  registeredClass,
                  true,
                  false,
                  false);

              var pointerConverter = new RegisteredPointer(
                  name + '*',
                  registeredClass,
                  false,
                  false,
                  false);

              var constPointerConverter = new RegisteredPointer(
                  name + ' const*',
                  registeredClass,
                  false,
                  true,
                  false);

              registeredPointers[rawType] = {
                  pointerType: pointerConverter,
                  constPointerType: constPointerConverter
              };

              replacePublicSymbol(legalFunctionName, constructor);

              return [referenceConverter, pointerConverter, constPointerConverter];
          }
      );
    }


  function heap32VectorToArray(count, firstElement) {
      var array = [];
      for (var i = 0; i < count; i++) {
          array.push(HEAP32[(firstElement >> 2) + i]);
      }
      return array;
    }

  function runDestructors(destructors) {
      while (destructors.length) {
          var ptr = destructors.pop();
          var del = destructors.pop();
          del(ptr);
      }
    }function __embind_register_class_constructor(
      rawClassType,
      argCount,
      rawArgTypesAddr,
      invokerSignature,
      invoker,
      rawConstructor
    ) {
      var rawArgTypes = heap32VectorToArray(argCount, rawArgTypesAddr);
      invoker = embind__requireFunction(invokerSignature, invoker);

      whenDependentTypesAreResolved([], [rawClassType], function(classType) {
          classType = classType[0];
          var humanName = 'constructor ' + classType.name;

          if (undefined === classType.registeredClass.constructor_body) {
              classType.registeredClass.constructor_body = [];
          }
          if (undefined !== classType.registeredClass.constructor_body[argCount - 1]) {
              throw new BindingError("Cannot register multiple constructors with identical number of parameters (" + (argCount-1) + ") for class '" + classType.name + "'! Overload resolution is currently only performed using the parameter count, not actual type info!");
          }
          classType.registeredClass.constructor_body[argCount - 1] = function unboundTypeHandler() {
              throwUnboundTypeError('Cannot construct ' + classType.name + ' due to unbound types', rawArgTypes);
          };

          whenDependentTypesAreResolved([], rawArgTypes, function(argTypes) {
              classType.registeredClass.constructor_body[argCount - 1] = function constructor_body() {
                  if (arguments.length !== argCount - 1) {
                      throwBindingError(humanName + ' called with ' + arguments.length + ' arguments, expected ' + (argCount-1));
                  }
                  var destructors = [];
                  var args = new Array(argCount);
                  args[0] = rawConstructor;
                  for (var i = 1; i < argCount; ++i) {
                      args[i] = argTypes[i]['toWireType'](destructors, arguments[i - 1]);
                  }

                  var ptr = invoker.apply(null, args);
                  runDestructors(destructors);

                  return argTypes[0]['fromWireType'](ptr);
              };
              return [];
          });
          return [];
      });
    }



  function new_(constructor, argumentList) {
      if (!(constructor instanceof Function)) {
          throw new TypeError('new_ called with constructor type ' + typeof(constructor) + " which is not a function");
      }

      /*
       * Previously, the following line was just:

       function dummy() {};

       * Unfortunately, Chrome was preserving 'dummy' as the object's name, even though at creation, the 'dummy' has the
       * correct constructor name.  Thus, objects created with IMVU.new would show up in the debugger as 'dummy', which
       * isn't very helpful.  Using IMVU.createNamedFunction addresses the issue.  Doublely-unfortunately, there's no way
       * to write a test for this behavior.  -NRD 2013.02.22
       */
      var dummy = createNamedFunction(constructor.name || 'unknownFunctionName', function(){});
      dummy.prototype = constructor.prototype;
      var obj = new dummy;

      var r = constructor.apply(obj, argumentList);
      return (r instanceof Object) ? r : obj;
    }function craftInvokerFunction(humanName, argTypes, classType, cppInvokerFunc, cppTargetFunc) {
      // humanName: a human-readable string name for the function to be generated.
      // argTypes: An array that contains the embind type objects for all types in the function signature.
      //    argTypes[0] is the type object for the function return value.
      //    argTypes[1] is the type object for function this object/class type, or null if not crafting an invoker for a class method.
      //    argTypes[2...] are the actual function parameters.
      // classType: The embind type object for the class to be bound, or null if this is not a method of a class.
      // cppInvokerFunc: JS Function object to the C++-side function that interops into C++ code.
      // cppTargetFunc: Function pointer (an integer to FUNCTION_TABLE) to the target C++ function the cppInvokerFunc will end up calling.
      var argCount = argTypes.length;

      if (argCount < 2) {
          throwBindingError("argTypes array size mismatch! Must at least get return value and 'this' types!");
      }

      var isClassMethodFunc = (argTypes[1] !== null && classType !== null);

      // Free functions with signature "void function()" do not need an invoker that marshalls between wire types.
  // TODO: This omits argument count check - enable only at -O3 or similar.
  //    if (ENABLE_UNSAFE_OPTS && argCount == 2 && argTypes[0].name == "void" && !isClassMethodFunc) {
  //       return FUNCTION_TABLE[fn];
  //    }


      // Determine if we need to use a dynamic stack to store the destructors for the function parameters.
      // TODO: Remove this completely once all function invokers are being dynamically generated.
      var needsDestructorStack = false;

      for(var i = 1; i < argTypes.length; ++i) { // Skip return value at index 0 - it's not deleted here.
          if (argTypes[i] !== null && argTypes[i].destructorFunction === undefined) { // The type does not define a destructor function - must use dynamic stack
              needsDestructorStack = true;
              break;
          }
      }

      var returns = (argTypes[0].name !== "void");

      var argsList = "";
      var argsListWired = "";
      for(var i = 0; i < argCount - 2; ++i) {
          argsList += (i!==0?", ":"")+"arg"+i;
          argsListWired += (i!==0?", ":"")+"arg"+i+"Wired";
      }

      var invokerFnBody =
          "return function "+makeLegalFunctionName(humanName)+"("+argsList+") {\n" +
          "if (arguments.length !== "+(argCount - 2)+") {\n" +
              "throwBindingError('function "+humanName+" called with ' + arguments.length + ' arguments, expected "+(argCount - 2)+" args!');\n" +
          "}\n";


      if (needsDestructorStack) {
          invokerFnBody +=
              "var destructors = [];\n";
      }

      var dtorStack = needsDestructorStack ? "destructors" : "null";
      var args1 = ["throwBindingError", "invoker", "fn", "runDestructors", "retType", "classParam"];
      var args2 = [throwBindingError, cppInvokerFunc, cppTargetFunc, runDestructors, argTypes[0], argTypes[1]];


      if (isClassMethodFunc) {
          invokerFnBody += "var thisWired = classParam.toWireType("+dtorStack+", this);\n";
      }

      for(var i = 0; i < argCount - 2; ++i) {
          invokerFnBody += "var arg"+i+"Wired = argType"+i+".toWireType("+dtorStack+", arg"+i+"); // "+argTypes[i+2].name+"\n";
          args1.push("argType"+i);
          args2.push(argTypes[i+2]);
      }

      if (isClassMethodFunc) {
          argsListWired = "thisWired" + (argsListWired.length > 0 ? ", " : "") + argsListWired;
      }

      invokerFnBody +=
          (returns?"var rv = ":"") + "invoker(fn"+(argsListWired.length>0?", ":"")+argsListWired+");\n";

      if (needsDestructorStack) {
          invokerFnBody += "runDestructors(destructors);\n";
      } else {
          for(var i = isClassMethodFunc?1:2; i < argTypes.length; ++i) { // Skip return value at index 0 - it's not deleted here. Also skip class type if not a method.
              var paramName = (i === 1 ? "thisWired" : ("arg"+(i - 2)+"Wired"));
              if (argTypes[i].destructorFunction !== null) {
                  invokerFnBody += paramName+"_dtor("+paramName+"); // "+argTypes[i].name+"\n";
                  args1.push(paramName+"_dtor");
                  args2.push(argTypes[i].destructorFunction);
              }
          }
      }

      if (returns) {
          invokerFnBody += "var ret = retType.fromWireType(rv);\n" +
                           "return ret;\n";
      } else {
      }
      invokerFnBody += "}\n";

      args1.push(invokerFnBody);

      var invokerFunction = new_(Function, args1).apply(null, args2);
      return invokerFunction;
    }function __embind_register_class_function(
      rawClassType,
      methodName,
      argCount,
      rawArgTypesAddr, // [ReturnType, ThisType, Args...]
      invokerSignature,
      rawInvoker,
      context,
      isPureVirtual
    ) {
      var rawArgTypes = heap32VectorToArray(argCount, rawArgTypesAddr);
      methodName = readLatin1String(methodName);
      rawInvoker = embind__requireFunction(invokerSignature, rawInvoker);

      whenDependentTypesAreResolved([], [rawClassType], function(classType) {
          classType = classType[0];
          var humanName = classType.name + '.' + methodName;

          if (isPureVirtual) {
              classType.registeredClass.pureVirtualFunctions.push(methodName);
          }

          function unboundTypesHandler() {
              throwUnboundTypeError('Cannot call ' + humanName + ' due to unbound types', rawArgTypes);
          }

          var proto = classType.registeredClass.instancePrototype;
          var method = proto[methodName];
          if (undefined === method || (undefined === method.overloadTable && method.className !== classType.name && method.argCount === argCount - 2)) {
              // This is the first overload to be registered, OR we are replacing a function in the base class with a function in the derived class.
              unboundTypesHandler.argCount = argCount - 2;
              unboundTypesHandler.className = classType.name;
              proto[methodName] = unboundTypesHandler;
          } else {
              // There was an existing function with the same name registered. Set up a function overload routing table.
              ensureOverloadTable(proto, methodName, humanName);
              proto[methodName].overloadTable[argCount - 2] = unboundTypesHandler;
          }

          whenDependentTypesAreResolved([], rawArgTypes, function(argTypes) {

              var memberFunction = craftInvokerFunction(humanName, argTypes, classType, rawInvoker, context);

              // Replace the initial unbound-handler-stub function with the appropriate member function, now that all types
              // are resolved. If multiple overloads are registered for this function, the function goes into an overload table.
              if (undefined === proto[methodName].overloadTable) {
                  // Set argCount in case an overload is registered later
                  memberFunction.argCount = argCount - 2;
                  proto[methodName] = memberFunction;
              } else {
                  proto[methodName].overloadTable[argCount - 2] = memberFunction;
              }

              return [];
          });
          return [];
      });
    }



  var emval_free_list=[];

  var emval_handle_array=[{},{value:undefined},{value:null},{value:true},{value:false}];function __emval_decref(handle) {
      if (handle > 4 && 0 === --emval_handle_array[handle].refcount) {
          emval_handle_array[handle] = undefined;
          emval_free_list.push(handle);
      }
    }



  function count_emval_handles() {
      var count = 0;
      for (var i = 5; i < emval_handle_array.length; ++i) {
          if (emval_handle_array[i] !== undefined) {
              ++count;
          }
      }
      return count;
    }

  function get_first_emval() {
      for (var i = 5; i < emval_handle_array.length; ++i) {
          if (emval_handle_array[i] !== undefined) {
              return emval_handle_array[i];
          }
      }
      return null;
    }function init_emval() {
      Module['count_emval_handles'] = count_emval_handles;
      Module['get_first_emval'] = get_first_emval;
    }function __emval_register(value) {

      switch(value){
        case undefined :{ return 1; }
        case null :{ return 2; }
        case true :{ return 3; }
        case false :{ return 4; }
        default:{
          var handle = emval_free_list.length ?
              emval_free_list.pop() :
              emval_handle_array.length;

          emval_handle_array[handle] = {refcount: 1, value: value};
          return handle;
          }
        }
    }function __embind_register_emval(rawType, name) {
      name = readLatin1String(name);
      registerType(rawType, {
          name: name,
          'fromWireType': function(handle) {
              var rv = emval_handle_array[handle].value;
              __emval_decref(handle);
              return rv;
          },
          'toWireType': function(destructors, value) {
              return __emval_register(value);
          },
          'argPackAdvance': 8,
          'readValueFromPointer': simpleReadValueFromPointer,
          destructorFunction: null, // This type does not need a destructor

          // TODO: do we need a deleteObject here?  write a test where
          // emval is passed into JS via an interface
      });
    }


  function _embind_repr(v) {
      if (v === null) {
          return 'null';
      }
      var t = typeof v;
      if (t === 'object' || t === 'array' || t === 'function') {
          return v.toString();
      } else {
          return '' + v;
      }
    }

  function floatReadValueFromPointer(name, shift) {
      switch (shift) {
          case 2: return function(pointer) {
              return this['fromWireType'](HEAPF32[pointer >> 2]);
          };
          case 3: return function(pointer) {
              return this['fromWireType'](HEAPF64[pointer >> 3]);
          };
          default:
              throw new TypeError("Unknown float type: " + name);
      }
    }function __embind_register_float(rawType, name, size) {
      var shift = getShiftFromSize(size);
      name = readLatin1String(name);
      registerType(rawType, {
          name: name,
          'fromWireType': function(value) {
              return value;
          },
          'toWireType': function(destructors, value) {
              // todo: Here we have an opportunity for -O3 level "unsafe" optimizations: we could
              // avoid the following if() and assume value is of proper type.
              if (typeof value !== "number" && typeof value !== "boolean") {
                  throw new TypeError('Cannot convert "' + _embind_repr(value) + '" to ' + this.name);
              }
              return value;
          },
          'argPackAdvance': 8,
          'readValueFromPointer': floatReadValueFromPointer(name, shift),
          destructorFunction: null, // This type does not need a destructor
      });
    }


  function integerReadValueFromPointer(name, shift, signed) {
      // integers are quite common, so generate very specialized functions
      switch (shift) {
          case 0: return signed ?
              function readS8FromPointer(pointer) { return HEAP8[pointer]; } :
              function readU8FromPointer(pointer) { return HEAPU8[pointer]; };
          case 1: return signed ?
              function readS16FromPointer(pointer) { return HEAP16[pointer >> 1]; } :
              function readU16FromPointer(pointer) { return HEAPU16[pointer >> 1]; };
          case 2: return signed ?
              function readS32FromPointer(pointer) { return HEAP32[pointer >> 2]; } :
              function readU32FromPointer(pointer) { return HEAPU32[pointer >> 2]; };
          default:
              throw new TypeError("Unknown integer type: " + name);
      }
    }function __embind_register_integer(primitiveType, name, size, minRange, maxRange) {
      name = readLatin1String(name);
      if (maxRange === -1) { // LLVM doesn't have signed and unsigned 32-bit types, so u32 literals come out as 'i32 -1'. Always treat those as max u32.
          maxRange = 4294967295;
      }

      var shift = getShiftFromSize(size);

      var fromWireType = function(value) {
          return value;
      };

      if (minRange === 0) {
          var bitshift = 32 - 8*size;
          fromWireType = function(value) {
              return (value << bitshift) >>> bitshift;
          };
      }

      var isUnsignedType = (name.indexOf('unsigned') != -1);

      registerType(primitiveType, {
          name: name,
          'fromWireType': fromWireType,
          'toWireType': function(destructors, value) {
              // todo: Here we have an opportunity for -O3 level "unsafe" optimizations: we could
              // avoid the following two if()s and assume value is of proper type.
              if (typeof value !== "number" && typeof value !== "boolean") {
                  throw new TypeError('Cannot convert "' + _embind_repr(value) + '" to ' + this.name);
              }
              if (value < minRange || value > maxRange) {
                  throw new TypeError('Passing a number "' + _embind_repr(value) + '" from JS side to C/C++ side to an argument of type "' + name + '", which is outside the valid range [' + minRange + ', ' + maxRange + ']!');
              }
              return isUnsignedType ? (value >>> 0) : (value | 0);
          },
          'argPackAdvance': 8,
          'readValueFromPointer': integerReadValueFromPointer(name, shift, minRange !== 0),
          destructorFunction: null, // This type does not need a destructor
      });
    }

  function __embind_register_memory_view(rawType, dataTypeIndex, name) {
      var typeMapping = [
          Int8Array,
          Uint8Array,
          Int16Array,
          Uint16Array,
          Int32Array,
          Uint32Array,
          Float32Array,
          Float64Array,
      ];

      var TA = typeMapping[dataTypeIndex];

      function decodeMemoryView(handle) {
          handle = handle >> 2;
          var heap = HEAPU32;
          var size = heap[handle]; // in elements
          var data = heap[handle + 1]; // byte offset into emscripten heap
          return new TA(heap['buffer'], data, size);
      }

      name = readLatin1String(name);
      registerType(rawType, {
          name: name,
          'fromWireType': decodeMemoryView,
          'argPackAdvance': 8,
          'readValueFromPointer': decodeMemoryView,
      }, {
          ignoreDuplicateRegistrations: true,
      });
    }

  function __embind_register_std_string(rawType, name) {
      name = readLatin1String(name);
      registerType(rawType, {
          name: name,
          'fromWireType': function(value) {
              var length = HEAPU32[value >> 2];
              var a = new Array(length);
              for (var i = 0; i < length; ++i) {
                  a[i] = String.fromCharCode(HEAPU8[value + 4 + i]);
              }
              _free(value);
              return a.join('');
          },
          'toWireType': function(destructors, value) {
              if (value instanceof ArrayBuffer) {
                  value = new Uint8Array(value);
              }

              function getTAElement(ta, index) {
                  return ta[index];
              }
              function getStringElement(string, index) {
                  return string.charCodeAt(index);
              }
              var getElement;
              if (value instanceof Uint8Array) {
                  getElement = getTAElement;
              } else if (value instanceof Uint8ClampedArray) {
                  getElement = getTAElement;
              } else if (value instanceof Int8Array) {
                  getElement = getTAElement;
              } else if (typeof value === 'string') {
                  getElement = getStringElement;
              } else {
                  throwBindingError('Cannot pass non-string to std::string');
              }

              // assumes 4-byte alignment
              var length = value.length;
              var ptr = _malloc(4 + length);
              HEAPU32[ptr >> 2] = length;
              for (var i = 0; i < length; ++i) {
                  var charCode = getElement(value, i);
                  if (charCode > 255) {
                      _free(ptr);
                      throwBindingError('String has UTF-16 code units that do not fit in 8 bits');
                  }
                  HEAPU8[ptr + 4 + i] = charCode;
              }
              if (destructors !== null) {
                  destructors.push(_free, ptr);
              }
              return ptr;
          },
          'argPackAdvance': 8,
          'readValueFromPointer': simpleReadValueFromPointer,
          destructorFunction: function(ptr) { _free(ptr); },
      });
    }

  function __embind_register_std_wstring(rawType, charSize, name) {
      // nb. do not cache HEAPU16 and HEAPU32, they may be destroyed by enlargeMemory().
      name = readLatin1String(name);
      var getHeap, shift;
      if (charSize === 2) {
          getHeap = function() { return HEAPU16; };
          shift = 1;
      } else if (charSize === 4) {
          getHeap = function() { return HEAPU32; };
          shift = 2;
      }
      registerType(rawType, {
          name: name,
          'fromWireType': function(value) {
              var HEAP = getHeap();
              var length = HEAPU32[value >> 2];
              var a = new Array(length);
              var start = (value + 4) >> shift;
              for (var i = 0; i < length; ++i) {
                  a[i] = String.fromCharCode(HEAP[start + i]);
              }
              _free(value);
              return a.join('');
          },
          'toWireType': function(destructors, value) {
              // assumes 4-byte alignment
              var HEAP = getHeap();
              var length = value.length;
              var ptr = _malloc(4 + length * charSize);
              HEAPU32[ptr >> 2] = length;
              var start = (ptr + 4) >> shift;
              for (var i = 0; i < length; ++i) {
                  HEAP[start + i] = value.charCodeAt(i);
              }
              if (destructors !== null) {
                  destructors.push(_free, ptr);
              }
              return ptr;
          },
          'argPackAdvance': 8,
          'readValueFromPointer': simpleReadValueFromPointer,
          destructorFunction: function(ptr) { _free(ptr); },
      });
    }

  function __embind_register_void(rawType, name) {
      name = readLatin1String(name);
      registerType(rawType, {
          isVoid: true, // void return values can be optimized out sometimes
          name: name,
          'argPackAdvance': 0,
          'fromWireType': function() {
              return undefined;
          },
          'toWireType': function(destructors, o) {
              // TODO: assert if anything else is given?
              return undefined;
          },
      });
    }

  function _abort() {
      Module['abort']();
    }



  function __reallyNegative(x) {
      return x < 0 || (x === 0 && (1/x) === -Infinity);
    }function __formatString(format, varargs) {
      assert((varargs & 3) === 0);
      var textIndex = format;
      var argIndex = varargs;
      // This must be called before reading a double or i64 vararg. It will bump the pointer properly.
      // It also does an assert on i32 values, so it's nice to call it before all varargs calls.
      function prepVararg(ptr, type) {
        if (type === 'double' || type === 'i64') {
          // move so the load is aligned
          if (ptr & 7) {
            assert((ptr & 7) === 4);
            ptr += 4;
          }
        } else {
          assert((ptr & 3) === 0);
        }
        return ptr;
      }
      function getNextArg(type) {
        // NOTE: Explicitly ignoring type safety. Otherwise this fails:
        //       int x = 4; printf("%c\n", (char)x);
        var ret;
        argIndex = prepVararg(argIndex, type);
        if (type === 'double') {
          ret = HEAPF64[((argIndex)>>3)];
          argIndex += 8;
        } else if (type == 'i64') {
          ret = [HEAP32[((argIndex)>>2)],
                 HEAP32[(((argIndex)+(4))>>2)]];
          argIndex += 8;
        } else {
          assert((argIndex & 3) === 0);
          type = 'i32'; // varargs are always i32, i64, or double
          ret = HEAP32[((argIndex)>>2)];
          argIndex += 4;
        }
        return ret;
      }

      var ret = [];
      var curr, next, currArg;
      while(1) {
        var startTextIndex = textIndex;
        curr = HEAP8[((textIndex)>>0)];
        if (curr === 0) break;
        next = HEAP8[((textIndex+1)>>0)];
        if (curr == 37) {
          // Handle flags.
          var flagAlwaysSigned = false;
          var flagLeftAlign = false;
          var flagAlternative = false;
          var flagZeroPad = false;
          var flagPadSign = false;
          flagsLoop: while (1) {
            switch (next) {
              case 43:
                flagAlwaysSigned = true;
                break;
              case 45:
                flagLeftAlign = true;
                break;
              case 35:
                flagAlternative = true;
                break;
              case 48:
                if (flagZeroPad) {
                  break flagsLoop;
                } else {
                  flagZeroPad = true;
                  break;
                }
              case 32:
                flagPadSign = true;
                break;
              default:
                break flagsLoop;
            }
            textIndex++;
            next = HEAP8[((textIndex+1)>>0)];
          }

          // Handle width.
          var width = 0;
          if (next == 42) {
            width = getNextArg('i32');
            textIndex++;
            next = HEAP8[((textIndex+1)>>0)];
          } else {
            while (next >= 48 && next <= 57) {
              width = width * 10 + (next - 48);
              textIndex++;
              next = HEAP8[((textIndex+1)>>0)];
            }
          }

          // Handle precision.
          var precisionSet = false, precision = -1;
          if (next == 46) {
            precision = 0;
            precisionSet = true;
            textIndex++;
            next = HEAP8[((textIndex+1)>>0)];
            if (next == 42) {
              precision = getNextArg('i32');
              textIndex++;
            } else {
              while(1) {
                var precisionChr = HEAP8[((textIndex+1)>>0)];
                if (precisionChr < 48 ||
                    precisionChr > 57) break;
                precision = precision * 10 + (precisionChr - 48);
                textIndex++;
              }
            }
            next = HEAP8[((textIndex+1)>>0)];
          }
          if (precision < 0) {
            precision = 6; // Standard default.
            precisionSet = false;
          }

          // Handle integer sizes. WARNING: These assume a 32-bit architecture!
          var argSize;
          switch (String.fromCharCode(next)) {
            case 'h':
              var nextNext = HEAP8[((textIndex+2)>>0)];
              if (nextNext == 104) {
                textIndex++;
                argSize = 1; // char (actually i32 in varargs)
              } else {
                argSize = 2; // short (actually i32 in varargs)
              }
              break;
            case 'l':
              var nextNext = HEAP8[((textIndex+2)>>0)];
              if (nextNext == 108) {
                textIndex++;
                argSize = 8; // long long
              } else {
                argSize = 4; // long
              }
              break;
            case 'L': // long long
            case 'q': // int64_t
            case 'j': // intmax_t
              argSize = 8;
              break;
            case 'z': // size_t
            case 't': // ptrdiff_t
            case 'I': // signed ptrdiff_t or unsigned size_t
              argSize = 4;
              break;
            default:
              argSize = null;
          }
          if (argSize) textIndex++;
          next = HEAP8[((textIndex+1)>>0)];

          // Handle type specifier.
          switch (String.fromCharCode(next)) {
            case 'd': case 'i': case 'u': case 'o': case 'x': case 'X': case 'p': {
              // Integer.
              var signed = next == 100 || next == 105;
              argSize = argSize || 4;
              currArg = getNextArg('i' + (argSize * 8));
              var origArg = currArg;
              var argText;
              // Flatten i64-1 [low, high] into a (slightly rounded) double
              if (argSize == 8) {
                currArg = makeBigInt(currArg[0], currArg[1], next == 117);
              }
              // Truncate to requested size.
              if (argSize <= 4) {
                var limit = Math.pow(256, argSize) - 1;
                currArg = (signed ? reSign : unSign)(currArg & limit, argSize * 8);
              }
              // Format the number.
              var currAbsArg = Math.abs(currArg);
              var prefix = '';
              if (next == 100 || next == 105) {
                if (argSize == 8 && typeof i64Math === 'object') argText = i64Math.stringify(origArg[0], origArg[1], null); else
                argText = reSign(currArg, 8 * argSize, 1).toString(10);
              } else if (next == 117) {
                if (argSize == 8 && typeof i64Math === 'object') argText = i64Math.stringify(origArg[0], origArg[1], true); else
                argText = unSign(currArg, 8 * argSize, 1).toString(10);
                currArg = Math.abs(currArg);
              } else if (next == 111) {
                argText = (flagAlternative ? '0' : '') + currAbsArg.toString(8);
              } else if (next == 120 || next == 88) {
                prefix = (flagAlternative && currArg != 0) ? '0x' : '';
                if (argSize == 8 && typeof i64Math === 'object') {
                  if (origArg[1]) {
                    argText = (origArg[1]>>>0).toString(16);
                    var lower = (origArg[0]>>>0).toString(16);
                    while (lower.length < 8) lower = '0' + lower;
                    argText += lower;
                  } else {
                    argText = (origArg[0]>>>0).toString(16);
                  }
                } else
                if (currArg < 0) {
                  // Represent negative numbers in hex as 2's complement.
                  currArg = -currArg;
                  argText = (currAbsArg - 1).toString(16);
                  var buffer = [];
                  for (var i = 0; i < argText.length; i++) {
                    buffer.push((0xF - parseInt(argText[i], 16)).toString(16));
                  }
                  argText = buffer.join('');
                  while (argText.length < argSize * 2) argText = 'f' + argText;
                } else {
                  argText = currAbsArg.toString(16);
                }
                if (next == 88) {
                  prefix = prefix.toUpperCase();
                  argText = argText.toUpperCase();
                }
              } else if (next == 112) {
                if (currAbsArg === 0) {
                  argText = '(nil)';
                } else {
                  prefix = '0x';
                  argText = currAbsArg.toString(16);
                }
              }
              if (precisionSet) {
                while (argText.length < precision) {
                  argText = '0' + argText;
                }
              }

              // Add sign if needed
              if (currArg >= 0) {
                if (flagAlwaysSigned) {
                  prefix = '+' + prefix;
                } else if (flagPadSign) {
                  prefix = ' ' + prefix;
                }
              }

              // Move sign to prefix so we zero-pad after the sign
              if (argText.charAt(0) == '-') {
                prefix = '-' + prefix;
                argText = argText.substr(1);
              }

              // Add padding.
              while (prefix.length + argText.length < width) {
                if (flagLeftAlign) {
                  argText += ' ';
                } else {
                  if (flagZeroPad) {
                    argText = '0' + argText;
                  } else {
                    prefix = ' ' + prefix;
                  }
                }
              }

              // Insert the result into the buffer.
              argText = prefix + argText;
              argText.split('').forEach(function(chr) {
                ret.push(chr.charCodeAt(0));
              });
              break;
            }
            case 'f': case 'F': case 'e': case 'E': case 'g': case 'G': {
              // Float.
              currArg = getNextArg('double');
              var argText;
              if (isNaN(currArg)) {
                argText = 'nan';
                flagZeroPad = false;
              } else if (!isFinite(currArg)) {
                argText = (currArg < 0 ? '-' : '') + 'inf';
                flagZeroPad = false;
              } else {
                var isGeneral = false;
                var effectivePrecision = Math.min(precision, 20);

                // Convert g/G to f/F or e/E, as per:
                // http://pubs.opengroup.org/onlinepubs/9699919799/functions/printf.html
                if (next == 103 || next == 71) {
                  isGeneral = true;
                  precision = precision || 1;
                  var exponent = parseInt(currArg.toExponential(effectivePrecision).split('e')[1], 10);
                  if (precision > exponent && exponent >= -4) {
                    next = ((next == 103) ? 'f' : 'F').charCodeAt(0);
                    precision -= exponent + 1;
                  } else {
                    next = ((next == 103) ? 'e' : 'E').charCodeAt(0);
                    precision--;
                  }
                  effectivePrecision = Math.min(precision, 20);
                }

                if (next == 101 || next == 69) {
                  argText = currArg.toExponential(effectivePrecision);
                  // Make sure the exponent has at least 2 digits.
                  if (/[eE][-+]\d$/.test(argText)) {
                    argText = argText.slice(0, -1) + '0' + argText.slice(-1);
                  }
                } else if (next == 102 || next == 70) {
                  argText = currArg.toFixed(effectivePrecision);
                  if (currArg === 0 && __reallyNegative(currArg)) {
                    argText = '-' + argText;
                  }
                }

                var parts = argText.split('e');
                if (isGeneral && !flagAlternative) {
                  // Discard trailing zeros and periods.
                  while (parts[0].length > 1 && parts[0].indexOf('.') != -1 &&
                         (parts[0].slice(-1) == '0' || parts[0].slice(-1) == '.')) {
                    parts[0] = parts[0].slice(0, -1);
                  }
                } else {
                  // Make sure we have a period in alternative mode.
                  if (flagAlternative && argText.indexOf('.') == -1) parts[0] += '.';
                  // Zero pad until required precision.
                  while (precision > effectivePrecision++) parts[0] += '0';
                }
                argText = parts[0] + (parts.length > 1 ? 'e' + parts[1] : '');

                // Capitalize 'E' if needed.
                if (next == 69) argText = argText.toUpperCase();

                // Add sign.
                if (currArg >= 0) {
                  if (flagAlwaysSigned) {
                    argText = '+' + argText;
                  } else if (flagPadSign) {
                    argText = ' ' + argText;
                  }
                }
              }

              // Add padding.
              while (argText.length < width) {
                if (flagLeftAlign) {
                  argText += ' ';
                } else {
                  if (flagZeroPad && (argText[0] == '-' || argText[0] == '+')) {
                    argText = argText[0] + '0' + argText.slice(1);
                  } else {
                    argText = (flagZeroPad ? '0' : ' ') + argText;
                  }
                }
              }

              // Adjust case.
              if (next < 97) argText = argText.toUpperCase();

              // Insert the result into the buffer.
              argText.split('').forEach(function(chr) {
                ret.push(chr.charCodeAt(0));
              });
              break;
            }
            case 's': {
              // String.
              var arg = getNextArg('i8*');
              var argLength = arg ? _strlen(arg) : '(null)'.length;
              if (precisionSet) argLength = Math.min(argLength, precision);
              if (!flagLeftAlign) {
                while (argLength < width--) {
                  ret.push(32);
                }
              }
              if (arg) {
                for (var i = 0; i < argLength; i++) {
                  ret.push(HEAPU8[((arg++)>>0)]);
                }
              } else {
                ret = ret.concat(intArrayFromString('(null)'.substr(0, argLength), true));
              }
              if (flagLeftAlign) {
                while (argLength < width--) {
                  ret.push(32);
                }
              }
              break;
            }
            case 'c': {
              // Character.
              if (flagLeftAlign) ret.push(getNextArg('i8'));
              while (--width > 0) {
                ret.push(32);
              }
              if (!flagLeftAlign) ret.push(getNextArg('i8'));
              break;
            }
            case 'n': {
              // Write the length written so far to the next parameter.
              var ptr = getNextArg('i32*');
              HEAP32[((ptr)>>2)]=ret.length;
              break;
            }
            case '%': {
              // Literal percent sign.
              ret.push(curr);
              break;
            }
            default: {
              // Unknown specifiers remain untouched.
              for (var i = startTextIndex; i < textIndex + 2; i++) {
                ret.push(HEAP8[((i)>>0)]);
              }
            }
          }
          textIndex += 2;
          // TODO: Support a/A (hex float) and m (last error) specifiers.
          // TODO: Support %1${specifier} for arg selection.
        } else {
          ret.push(curr);
          textIndex += 1;
        }
      }
      return ret;
    }



  function __emscripten_traverse_stack(args) {
      if (!args || !args.callee || !args.callee.name) {
        return [null, '', ''];
      }

      var funstr = args.callee.toString();
      var funcname = args.callee.name;
      var str = '(';
      var first = true;
      for (var i in args) {
        var a = args[i];
        if (!first) {
          str += ", ";
        }
        first = false;
        if (typeof a === 'number' || typeof a === 'string') {
          str += a;
        } else {
          str += '(' + typeof a + ')';
        }
      }
      str += ')';
      var caller = args.callee.caller;
      args = caller ? caller.arguments : [];
      if (first)
        str = '';
      return [args, funcname, str];
    }function _emscripten_get_callstack_js(flags) {
      var callstack = jsStackTrace();

      // Find the symbols in the callstack that corresponds to the functions that report callstack information, and remove everyhing up to these from the output.
      var iThisFunc = callstack.lastIndexOf('_emscripten_log');
      var iThisFunc2 = callstack.lastIndexOf('_emscripten_get_callstack');
      var iNextLine = callstack.indexOf('\n', Math.max(iThisFunc, iThisFunc2))+1;
      callstack = callstack.slice(iNextLine);

      // If user requested to see the original source stack, but no source map information is available, just fall back to showing the JS stack.
      if (flags & 8/*EM_LOG_C_STACK*/ && typeof emscripten_source_map === 'undefined') {
        warnOnce('Source map information is not available, emscripten_log with EM_LOG_C_STACK will be ignored. Build with "--pre-js $EMSCRIPTEN/src/emscripten-source-map.min.js" linker flag to add source map loading to code.');
        flags ^= 8/*EM_LOG_C_STACK*/;
        flags |= 16/*EM_LOG_JS_STACK*/;
      }

      var stack_args = null;
      if (flags & 128 /*EM_LOG_FUNC_PARAMS*/) {
        // To get the actual parameters to the functions, traverse the stack via the unfortunately deprecated 'arguments.callee' method, if it works:
        stack_args = __emscripten_traverse_stack(arguments);
        while (stack_args[1].indexOf('_emscripten_') >= 0)
          stack_args = __emscripten_traverse_stack(stack_args[0]);
      }

      // Process all lines:
      var lines = callstack.split('\n');
      callstack = '';
      var newFirefoxRe = new RegExp('\\s*(.*?)@(.*?):([0-9]+):([0-9]+)'); // New FF30 with column info: extract components of form '       Object._main@http://server.com:4324:12'
      var firefoxRe = new RegExp('\\s*(.*?)@(.*):(.*)(:(.*))?'); // Old FF without column info: extract components of form '       Object._main@http://server.com:4324'
      var chromeRe = new RegExp('\\s*at (.*?) \\\((.*):(.*):(.*)\\\)'); // Extract components of form '    at Object._main (http://server.com/file.html:4324:12)'

      for (var l in lines) {
        var line = lines[l];

        var jsSymbolName = '';
        var file = '';
        var lineno = 0;
        var column = 0;

        var parts = chromeRe.exec(line);
        if (parts && parts.length == 5) {
          jsSymbolName = parts[1];
          file = parts[2];
          lineno = parts[3];
          column = parts[4];
        } else {
          parts = newFirefoxRe.exec(line);
          if (!parts) parts = firefoxRe.exec(line);
          if (parts && parts.length >= 4) {
            jsSymbolName = parts[1];
            file = parts[2];
            lineno = parts[3];
            column = parts[4]|0; // Old Firefox doesn't carry column information, but in new FF30, it is present. See https://bugzilla.mozilla.org/show_bug.cgi?id=762556
          } else {
            // Was not able to extract this line for demangling/sourcemapping purposes. Output it as-is.
            callstack += line + '\n';
            continue;
          }
        }

        // Try to demangle the symbol, but fall back to showing the original JS symbol name if not available.
        var cSymbolName = (flags & 32/*EM_LOG_DEMANGLE*/) ? demangle(jsSymbolName) : jsSymbolName;
        if (!cSymbolName) {
          cSymbolName = jsSymbolName;
        }

        var haveSourceMap = false;

        if (flags & 8/*EM_LOG_C_STACK*/) {
          var orig = emscripten_source_map.originalPositionFor({line: lineno, column: column});
          haveSourceMap = (orig && orig.source);
          if (haveSourceMap) {
            if (flags & 64/*EM_LOG_NO_PATHS*/) {
              orig.source = orig.source.substring(orig.source.replace(/\\/g, "/").lastIndexOf('/')+1);
            }
            callstack += '    at ' + cSymbolName + ' (' + orig.source + ':' + orig.line + ':' + orig.column + ')\n';
          }
        }
        if ((flags & 16/*EM_LOG_JS_STACK*/) || !haveSourceMap) {
          if (flags & 64/*EM_LOG_NO_PATHS*/) {
            file = file.substring(file.replace(/\\/g, "/").lastIndexOf('/')+1);
          }
          callstack += (haveSourceMap ? ('     = '+jsSymbolName) : ('    at '+cSymbolName)) + ' (' + file + ':' + lineno + ':' + column + ')\n';
        }

        // If we are still keeping track with the callstack by traversing via 'arguments.callee', print the function parameters as well.
        if (flags & 128 /*EM_LOG_FUNC_PARAMS*/ && stack_args[0]) {
          if (stack_args[1] == jsSymbolName && stack_args[2].length > 0) {
            callstack = callstack.replace(/\s+$/, '');
            callstack += ' with values: ' + stack_args[1] + stack_args[2] + '\n';
          }
          stack_args = __emscripten_traverse_stack(stack_args[0]);
        }
      }
      // Trim extra whitespace at the end of the output.
      callstack = callstack.replace(/\s+$/, '');
      return callstack;
    }function _emscripten_log_js(flags, str) {
      if (flags & 24/*EM_LOG_C_STACK | EM_LOG_JS_STACK*/) {
        str = str.replace(/\s+$/, ''); // Ensure the message and the callstack are joined cleanly with exactly one newline.
        str += (str.length > 0 ? '\n' : '') + _emscripten_get_callstack_js(flags);
      }

      if (flags & 1 /*EM_LOG_CONSOLE*/) {
        if (flags & 4 /*EM_LOG_ERROR*/) {
          console.error(str);
        } else if (flags & 2 /*EM_LOG_WARN*/) {
          console.warn(str);
        } else {
          console.log(str);
        }
      } else if (flags & 6 /*EM_LOG_ERROR|EM_LOG_WARN*/) {
        err(str);
      } else {
        out(str);
      }
    }function _emscripten_log(flags, varargs) {
      // Extract the (optionally-existing) printf format specifier field from varargs.
      var format = HEAP32[((varargs)>>2)];
      varargs += 4;
      var str = '';
      if (format) {
        var result = __formatString(format, varargs);
        for(var i = 0 ; i < result.length; ++i) {
          str += String.fromCharCode(result[i]);
        }
      }
      _emscripten_log_js(flags, str);
    }


  var ENV={};function _getenv(name) {
      // char *getenv(const char *name);
      // http://pubs.opengroup.org/onlinepubs/009695399/functions/getenv.html
      if (name === 0) return 0;
      name = Pointer_stringify(name);
      if (!ENV.hasOwnProperty(name)) return 0;

      if (_getenv.ret) _free(_getenv.ret);
      _getenv.ret = allocateUTF8(ENV[name]);
      return _getenv.ret;
    }



  var _llvm_ceil_f32=Math_ceil;

  var _llvm_ctlz_i32=true;

  function _llvm_exp2_f32(x) {
      return Math.pow(2, x);
    }

  var _llvm_fabs_f32=Math_abs;

  function _llvm_stackrestore(p) {
      var self = _llvm_stacksave;
      var ret = self.LLVM_SAVEDSTACKS[p];
      self.LLVM_SAVEDSTACKS.splice(p, 1);
      stackRestore(ret);
    }

  function _llvm_stacksave() {
      var self = _llvm_stacksave;
      if (!self.LLVM_SAVEDSTACKS) {
        self.LLVM_SAVEDSTACKS = [];
      }
      self.LLVM_SAVEDSTACKS.push(stackSave());
      return self.LLVM_SAVEDSTACKS.length-1;
    }

  function _llvm_trap() {
      abort('trap!');
    }


  function _emscripten_memcpy_big(dest, src, num) {
      HEAPU8.set(HEAPU8.subarray(src, src+num), dest);
      return dest;
    }







  function _pthread_cond_wait() { return 0; }


  var PTHREAD_SPECIFIC={};function _pthread_getspecific(key) {
      return PTHREAD_SPECIFIC[key] || 0;
    }


  var PTHREAD_SPECIFIC_NEXT_KEY=1;function _pthread_key_create(key, destructor) {
      if (key == 0) {
        return ERRNO_CODES.EINVAL;
      }
      HEAP32[((key)>>2)]=PTHREAD_SPECIFIC_NEXT_KEY;
      // values start at 0
      PTHREAD_SPECIFIC[PTHREAD_SPECIFIC_NEXT_KEY] = 0;
      PTHREAD_SPECIFIC_NEXT_KEY++;
      return 0;
    }

  function _pthread_mutex_destroy() {}





  function _pthread_once(ptr, func) {
      if (!_pthread_once.seen) _pthread_once.seen = {};
      if (ptr in _pthread_once.seen) return;
      Module['dynCall_v'](func);
      _pthread_once.seen[ptr] = 1;
    }

  function _pthread_setspecific(key, value) {
      if (!(key in PTHREAD_SPECIFIC)) {
        return ERRNO_CODES.EINVAL;
      }
      PTHREAD_SPECIFIC[key] = value;
      return 0;
    }





  function __isLeapYear(year) {
        return year%4 === 0 && (year%100 !== 0 || year%400 === 0);
    }

  function __arraySum(array, index) {
      var sum = 0;
      for (var i = 0; i <= index; sum += array[i++]);
      return sum;
    }


  var __MONTH_DAYS_LEAP=[31,29,31,30,31,30,31,31,30,31,30,31];

  var __MONTH_DAYS_REGULAR=[31,28,31,30,31,30,31,31,30,31,30,31];function __addDays(date, days) {
      var newDate = new Date(date.getTime());
      while(days > 0) {
        var leap = __isLeapYear(newDate.getFullYear());
        var currentMonth = newDate.getMonth();
        var daysInCurrentMonth = (leap ? __MONTH_DAYS_LEAP : __MONTH_DAYS_REGULAR)[currentMonth];

        if (days > daysInCurrentMonth-newDate.getDate()) {
          // we spill over to next month
          days -= (daysInCurrentMonth-newDate.getDate()+1);
          newDate.setDate(1);
          if (currentMonth < 11) {
            newDate.setMonth(currentMonth+1)
          } else {
            newDate.setMonth(0);
            newDate.setFullYear(newDate.getFullYear()+1);
          }
        } else {
          // we stay in current month
          newDate.setDate(newDate.getDate()+days);
          return newDate;
        }
      }

      return newDate;
    }function _strftime(s, maxsize, format, tm) {
      // size_t strftime(char *restrict s, size_t maxsize, const char *restrict format, const struct tm *restrict timeptr);
      // http://pubs.opengroup.org/onlinepubs/009695399/functions/strftime.html

      var tm_zone = HEAP32[(((tm)+(40))>>2)];

      var date = {
        tm_sec: HEAP32[((tm)>>2)],
        tm_min: HEAP32[(((tm)+(4))>>2)],
        tm_hour: HEAP32[(((tm)+(8))>>2)],
        tm_mday: HEAP32[(((tm)+(12))>>2)],
        tm_mon: HEAP32[(((tm)+(16))>>2)],
        tm_year: HEAP32[(((tm)+(20))>>2)],
        tm_wday: HEAP32[(((tm)+(24))>>2)],
        tm_yday: HEAP32[(((tm)+(28))>>2)],
        tm_isdst: HEAP32[(((tm)+(32))>>2)],
        tm_gmtoff: HEAP32[(((tm)+(36))>>2)],
        tm_zone: tm_zone ? Pointer_stringify(tm_zone) : ''
      };

      var pattern = Pointer_stringify(format);

      // expand format
      var EXPANSION_RULES_1 = {
        '%c': '%a %b %d %H:%M:%S %Y',     // Replaced by the locale's appropriate date and time representation - e.g., Mon Aug  3 14:02:01 2013
        '%D': '%m/%d/%y',                 // Equivalent to %m / %d / %y
        '%F': '%Y-%m-%d',                 // Equivalent to %Y - %m - %d
        '%h': '%b',                       // Equivalent to %b
        '%r': '%I:%M:%S %p',              // Replaced by the time in a.m. and p.m. notation
        '%R': '%H:%M',                    // Replaced by the time in 24-hour notation
        '%T': '%H:%M:%S',                 // Replaced by the time
        '%x': '%m/%d/%y',                 // Replaced by the locale's appropriate date representation
        '%X': '%H:%M:%S'                  // Replaced by the locale's appropriate date representation
      };
      for (var rule in EXPANSION_RULES_1) {
        pattern = pattern.replace(new RegExp(rule, 'g'), EXPANSION_RULES_1[rule]);
      }

      var WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

      function leadingSomething(value, digits, character) {
        var str = typeof value === 'number' ? value.toString() : (value || '');
        while (str.length < digits) {
          str = character[0]+str;
        }
        return str;
      };

      function leadingNulls(value, digits) {
        return leadingSomething(value, digits, '0');
      };

      function compareByDay(date1, date2) {
        function sgn(value) {
          return value < 0 ? -1 : (value > 0 ? 1 : 0);
        };

        var compare;
        if ((compare = sgn(date1.getFullYear()-date2.getFullYear())) === 0) {
          if ((compare = sgn(date1.getMonth()-date2.getMonth())) === 0) {
            compare = sgn(date1.getDate()-date2.getDate());
          }
        }
        return compare;
      };

      function getFirstWeekStartDate(janFourth) {
          switch (janFourth.getDay()) {
            case 0: // Sunday
              return new Date(janFourth.getFullYear()-1, 11, 29);
            case 1: // Monday
              return janFourth;
            case 2: // Tuesday
              return new Date(janFourth.getFullYear(), 0, 3);
            case 3: // Wednesday
              return new Date(janFourth.getFullYear(), 0, 2);
            case 4: // Thursday
              return new Date(janFourth.getFullYear(), 0, 1);
            case 5: // Friday
              return new Date(janFourth.getFullYear()-1, 11, 31);
            case 6: // Saturday
              return new Date(janFourth.getFullYear()-1, 11, 30);
          }
      };

      function getWeekBasedYear(date) {
          var thisDate = __addDays(new Date(date.tm_year+1900, 0, 1), date.tm_yday);

          var janFourthThisYear = new Date(thisDate.getFullYear(), 0, 4);
          var janFourthNextYear = new Date(thisDate.getFullYear()+1, 0, 4);

          var firstWeekStartThisYear = getFirstWeekStartDate(janFourthThisYear);
          var firstWeekStartNextYear = getFirstWeekStartDate(janFourthNextYear);

          if (compareByDay(firstWeekStartThisYear, thisDate) <= 0) {
            // this date is after the start of the first week of this year
            if (compareByDay(firstWeekStartNextYear, thisDate) <= 0) {
              return thisDate.getFullYear()+1;
            } else {
              return thisDate.getFullYear();
            }
          } else {
            return thisDate.getFullYear()-1;
          }
      };

      var EXPANSION_RULES_2 = {
        '%a': function(date) {
          return WEEKDAYS[date.tm_wday].substring(0,3);
        },
        '%A': function(date) {
          return WEEKDAYS[date.tm_wday];
        },
        '%b': function(date) {
          return MONTHS[date.tm_mon].substring(0,3);
        },
        '%B': function(date) {
          return MONTHS[date.tm_mon];
        },
        '%C': function(date) {
          var year = date.tm_year+1900;
          return leadingNulls((year/100)|0,2);
        },
        '%d': function(date) {
          return leadingNulls(date.tm_mday, 2);
        },
        '%e': function(date) {
          return leadingSomething(date.tm_mday, 2, ' ');
        },
        '%g': function(date) {
          // %g, %G, and %V give values according to the ISO 8601:2000 standard week-based year.
          // In this system, weeks begin on a Monday and week 1 of the year is the week that includes
          // January 4th, which is also the week that includes the first Thursday of the year, and
          // is also the first week that contains at least four days in the year.
          // If the first Monday of January is the 2nd, 3rd, or 4th, the preceding days are part of
          // the last week of the preceding year; thus, for Saturday 2nd January 1999,
          // %G is replaced by 1998 and %V is replaced by 53. If December 29th, 30th,
          // or 31st is a Monday, it and any following days are part of week 1 of the following year.
          // Thus, for Tuesday 30th December 1997, %G is replaced by 1998 and %V is replaced by 01.

          return getWeekBasedYear(date).toString().substring(2);
        },
        '%G': function(date) {
          return getWeekBasedYear(date);
        },
        '%H': function(date) {
          return leadingNulls(date.tm_hour, 2);
        },
        '%I': function(date) {
          var twelveHour = date.tm_hour;
          if (twelveHour == 0) twelveHour = 12;
          else if (twelveHour > 12) twelveHour -= 12;
          return leadingNulls(twelveHour, 2);
        },
        '%j': function(date) {
          // Day of the year (001-366)
          return leadingNulls(date.tm_mday+__arraySum(__isLeapYear(date.tm_year+1900) ? __MONTH_DAYS_LEAP : __MONTH_DAYS_REGULAR, date.tm_mon-1), 3);
        },
        '%m': function(date) {
          return leadingNulls(date.tm_mon+1, 2);
        },
        '%M': function(date) {
          return leadingNulls(date.tm_min, 2);
        },
        '%n': function() {
          return '\n';
        },
        '%p': function(date) {
          if (date.tm_hour >= 0 && date.tm_hour < 12) {
            return 'AM';
          } else {
            return 'PM';
          }
        },
        '%S': function(date) {
          return leadingNulls(date.tm_sec, 2);
        },
        '%t': function() {
          return '\t';
        },
        '%u': function(date) {
          var day = new Date(date.tm_year+1900, date.tm_mon+1, date.tm_mday, 0, 0, 0, 0);
          return day.getDay() || 7;
        },
        '%U': function(date) {
          // Replaced by the week number of the year as a decimal number [00,53].
          // The first Sunday of January is the first day of week 1;
          // days in the new year before this are in week 0. [ tm_year, tm_wday, tm_yday]
          var janFirst = new Date(date.tm_year+1900, 0, 1);
          var firstSunday = janFirst.getDay() === 0 ? janFirst : __addDays(janFirst, 7-janFirst.getDay());
          var endDate = new Date(date.tm_year+1900, date.tm_mon, date.tm_mday);

          // is target date after the first Sunday?
          if (compareByDay(firstSunday, endDate) < 0) {
            // calculate difference in days between first Sunday and endDate
            var februaryFirstUntilEndMonth = __arraySum(__isLeapYear(endDate.getFullYear()) ? __MONTH_DAYS_LEAP : __MONTH_DAYS_REGULAR, endDate.getMonth()-1)-31;
            var firstSundayUntilEndJanuary = 31-firstSunday.getDate();
            var days = firstSundayUntilEndJanuary+februaryFirstUntilEndMonth+endDate.getDate();
            return leadingNulls(Math.ceil(days/7), 2);
          }

          return compareByDay(firstSunday, janFirst) === 0 ? '01': '00';
        },
        '%V': function(date) {
          // Replaced by the week number of the year (Monday as the first day of the week)
          // as a decimal number [01,53]. If the week containing 1 January has four
          // or more days in the new year, then it is considered week 1.
          // Otherwise, it is the last week of the previous year, and the next week is week 1.
          // Both January 4th and the first Thursday of January are always in week 1. [ tm_year, tm_wday, tm_yday]
          var janFourthThisYear = new Date(date.tm_year+1900, 0, 4);
          var janFourthNextYear = new Date(date.tm_year+1901, 0, 4);

          var firstWeekStartThisYear = getFirstWeekStartDate(janFourthThisYear);
          var firstWeekStartNextYear = getFirstWeekStartDate(janFourthNextYear);

          var endDate = __addDays(new Date(date.tm_year+1900, 0, 1), date.tm_yday);

          if (compareByDay(endDate, firstWeekStartThisYear) < 0) {
            // if given date is before this years first week, then it belongs to the 53rd week of last year
            return '53';
          }

          if (compareByDay(firstWeekStartNextYear, endDate) <= 0) {
            // if given date is after next years first week, then it belongs to the 01th week of next year
            return '01';
          }

          // given date is in between CW 01..53 of this calendar year
          var daysDifference;
          if (firstWeekStartThisYear.getFullYear() < date.tm_year+1900) {
            // first CW of this year starts last year
            daysDifference = date.tm_yday+32-firstWeekStartThisYear.getDate()
          } else {
            // first CW of this year starts this year
            daysDifference = date.tm_yday+1-firstWeekStartThisYear.getDate();
          }
          return leadingNulls(Math.ceil(daysDifference/7), 2);
        },
        '%w': function(date) {
          var day = new Date(date.tm_year+1900, date.tm_mon+1, date.tm_mday, 0, 0, 0, 0);
          return day.getDay();
        },
        '%W': function(date) {
          // Replaced by the week number of the year as a decimal number [00,53].
          // The first Monday of January is the first day of week 1;
          // days in the new year before this are in week 0. [ tm_year, tm_wday, tm_yday]
          var janFirst = new Date(date.tm_year, 0, 1);
          var firstMonday = janFirst.getDay() === 1 ? janFirst : __addDays(janFirst, janFirst.getDay() === 0 ? 1 : 7-janFirst.getDay()+1);
          var endDate = new Date(date.tm_year+1900, date.tm_mon, date.tm_mday);

          // is target date after the first Monday?
          if (compareByDay(firstMonday, endDate) < 0) {
            var februaryFirstUntilEndMonth = __arraySum(__isLeapYear(endDate.getFullYear()) ? __MONTH_DAYS_LEAP : __MONTH_DAYS_REGULAR, endDate.getMonth()-1)-31;
            var firstMondayUntilEndJanuary = 31-firstMonday.getDate();
            var days = firstMondayUntilEndJanuary+februaryFirstUntilEndMonth+endDate.getDate();
            return leadingNulls(Math.ceil(days/7), 2);
          }
          return compareByDay(firstMonday, janFirst) === 0 ? '01': '00';
        },
        '%y': function(date) {
          // Replaced by the last two digits of the year as a decimal number [00,99]. [ tm_year]
          return (date.tm_year+1900).toString().substring(2);
        },
        '%Y': function(date) {
          // Replaced by the year as a decimal number (for example, 1997). [ tm_year]
          return date.tm_year+1900;
        },
        '%z': function(date) {
          // Replaced by the offset from UTC in the ISO 8601:2000 standard format ( +hhmm or -hhmm ).
          // For example, "-0430" means 4 hours 30 minutes behind UTC (west of Greenwich).
          var off = date.tm_gmtoff;
          var ahead = off >= 0;
          off = Math.abs(off) / 60;
          // convert from minutes into hhmm format (which means 60 minutes = 100 units)
          off = (off / 60)*100 + (off % 60);
          return (ahead ? '+' : '-') + String("0000" + off).slice(-4);
        },
        '%Z': function(date) {
          return date.tm_zone;
        },
        '%%': function() {
          return '%';
        }
      };
      for (var rule in EXPANSION_RULES_2) {
        if (pattern.indexOf(rule) >= 0) {
          pattern = pattern.replace(new RegExp(rule, 'g'), EXPANSION_RULES_2[rule](date));
        }
      }

      var bytes = intArrayFromString(pattern, false);
      if (bytes.length > maxsize) {
        return 0;
      }

      writeArrayToMemory(bytes, s);
      return bytes.length-1;
    }function _strftime_l(s, maxsize, format, tm) {
      return _strftime(s, maxsize, format, tm); // no locale support yet
    }

  function _time(ptr) {
      var ret = (Date.now()/1000)|0;
      if (ptr) {
        HEAP32[((ptr)>>2)]=ret;
      }
      return ret;
    }
FS.staticInit();__ATINIT__.unshift(function() { if (!Module["noFSInit"] && !FS.init.initialized) FS.init() });__ATMAIN__.push(function() { FS.ignorePermissions = false });__ATEXIT__.push(function() { FS.quit() });;
__ATINIT__.unshift(function() { TTY.init() });__ATEXIT__.push(function() { TTY.shutdown() });;
if (ENVIRONMENT_IS_NODE) { var fs = require("fs"); var NODEJS_PATH = require("path"); NODEFS.staticInit(); };
embind_init_charCodes();
BindingError = Module['BindingError'] = extendError(Error, 'BindingError');;
InternalError = Module['InternalError'] = extendError(Error, 'InternalError');;
init_ClassHandle();
init_RegisteredPointer();
init_embind();;
UnboundTypeError = Module['UnboundTypeError'] = extendError(Error, 'UnboundTypeError');;
init_emval();;
DYNAMICTOP_PTR = staticAlloc(4);

STACK_BASE = STACKTOP = alignMemory(STATICTOP);

STACK_MAX = STACK_BASE + TOTAL_STACK;

DYNAMIC_BASE = alignMemory(STACK_MAX);

HEAP32[DYNAMICTOP_PTR>>2] = DYNAMIC_BASE;

staticSealed = true; // seal the static portion of memory

var ASSERTIONS = false;

/** @type {function(string, boolean=, number=)} */
function intArrayFromString(stringy, dontAddNull, length) {
  var len = length > 0 ? length : lengthBytesUTF8(stringy)+1;
  var u8array = new Array(len);
  var numBytesWritten = stringToUTF8Array(stringy, u8array, 0, u8array.length);
  if (dontAddNull) u8array.length = numBytesWritten;
  return u8array;
}

function intArrayToString(array) {
  var ret = [];
  for (var i = 0; i < array.length; i++) {
    var chr = array[i];
    if (chr > 0xFF) {
      if (ASSERTIONS) {
        assert(false, 'Character code ' + chr + ' (' + String.fromCharCode(chr) + ')  at offset ' + i + ' not in 0x00-0xFF.');
      }
      chr &= 0xFF;
    }
    ret.push(String.fromCharCode(chr));
  }
  return ret.join('');
}


// Copied from https://github.com/strophe/strophejs/blob/e06d027/src/polyfills.js#L149

// This code was written by Tyler Akins and has been placed in the
// public domain.  It would be nice if you left this header intact.
// Base64 code from Tyler Akins -- http://rumkin.com

/**
 * Decodes a base64 string.
 * @param {String} input The string to decode.
 */
var decodeBase64 = typeof atob === 'function' ? atob : function (input) {
  var keyStr = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';

  var output = '';
  var chr1, chr2, chr3;
  var enc1, enc2, enc3, enc4;
  var i = 0;
  // remove all characters that are not A-Z, a-z, 0-9, +, /, or =
  input = input.replace(/[^A-Za-z0-9\+\/\=]/g, '');
  do {
    enc1 = keyStr.indexOf(input.charAt(i++));
    enc2 = keyStr.indexOf(input.charAt(i++));
    enc3 = keyStr.indexOf(input.charAt(i++));
    enc4 = keyStr.indexOf(input.charAt(i++));

    chr1 = (enc1 << 2) | (enc2 >> 4);
    chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
    chr3 = ((enc3 & 3) << 6) | enc4;

    output = output + String.fromCharCode(chr1);

    if (enc3 !== 64) {
      output = output + String.fromCharCode(chr2);
    }
    if (enc4 !== 64) {
      output = output + String.fromCharCode(chr3);
    }
  } while (i < input.length);
  return output;
};

// Converts a string of base64 into a byte array.
// Throws error on invalid input.
function intArrayFromBase64(s) {
  if (typeof ENVIRONMENT_IS_NODE === 'boolean' && ENVIRONMENT_IS_NODE) {
    var buf;
    try {
      buf = Buffer.from(s, 'base64');
    } catch (_) {
      buf = new Buffer(s, 'base64');
    }
    return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
  }

  try {
    var decoded = decodeBase64(s);
    var bytes = new Uint8Array(decoded.length);
    for (var i = 0 ; i < decoded.length ; ++i) {
      bytes[i] = decoded.charCodeAt(i);
    }
    return bytes;
  } catch (_) {
    throw new Error('Converting base64 string to bytes failed.');
  }
}

// If filename is a base64 data URI, parses and returns data (Buffer on node,
// Uint8Array otherwise). If filename is not a base64 data URI, returns undefined.
function tryParseAsDataURI(filename) {
  if (!isDataURI(filename)) {
    return;
  }

  return intArrayFromBase64(filename.slice(dataURIPrefix.length));
}



Module['wasmTableSize'] = 719;

Module['wasmMaxTableSize'] = 719;

function invoke_di(index,a1) {
  var sp = stackSave();
  try {
    return Module["dynCall_di"](index,a1);
  } catch(e) {
    stackRestore(sp);
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    Module["setThrew"](1, 0);
  }
}

function invoke_i(index) {
  var sp = stackSave();
  try {
    return Module["dynCall_i"](index);
  } catch(e) {
    stackRestore(sp);
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    Module["setThrew"](1, 0);
  }
}

function invoke_ii(index,a1) {
  var sp = stackSave();
  try {
    return Module["dynCall_ii"](index,a1);
  } catch(e) {
    stackRestore(sp);
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    Module["setThrew"](1, 0);
  }
}

function invoke_iii(index,a1,a2) {
  var sp = stackSave();
  try {
    return Module["dynCall_iii"](index,a1,a2);
  } catch(e) {
    stackRestore(sp);
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    Module["setThrew"](1, 0);
  }
}

function invoke_iiii(index,a1,a2,a3) {
  var sp = stackSave();
  try {
    return Module["dynCall_iiii"](index,a1,a2,a3);
  } catch(e) {
    stackRestore(sp);
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    Module["setThrew"](1, 0);
  }
}

function invoke_iiiii(index,a1,a2,a3,a4) {
  var sp = stackSave();
  try {
    return Module["dynCall_iiiii"](index,a1,a2,a3,a4);
  } catch(e) {
    stackRestore(sp);
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    Module["setThrew"](1, 0);
  }
}

function invoke_iiiiid(index,a1,a2,a3,a4,a5) {
  var sp = stackSave();
  try {
    return Module["dynCall_iiiiid"](index,a1,a2,a3,a4,a5);
  } catch(e) {
    stackRestore(sp);
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    Module["setThrew"](1, 0);
  }
}

function invoke_iiiiii(index,a1,a2,a3,a4,a5) {
  var sp = stackSave();
  try {
    return Module["dynCall_iiiiii"](index,a1,a2,a3,a4,a5);
  } catch(e) {
    stackRestore(sp);
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    Module["setThrew"](1, 0);
  }
}

function invoke_iiiiiid(index,a1,a2,a3,a4,a5,a6) {
  var sp = stackSave();
  try {
    return Module["dynCall_iiiiiid"](index,a1,a2,a3,a4,a5,a6);
  } catch(e) {
    stackRestore(sp);
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    Module["setThrew"](1, 0);
  }
}

function invoke_iiiiiii(index,a1,a2,a3,a4,a5,a6) {
  var sp = stackSave();
  try {
    return Module["dynCall_iiiiiii"](index,a1,a2,a3,a4,a5,a6);
  } catch(e) {
    stackRestore(sp);
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    Module["setThrew"](1, 0);
  }
}

function invoke_iiiiiiii(index,a1,a2,a3,a4,a5,a6,a7) {
  var sp = stackSave();
  try {
    return Module["dynCall_iiiiiiii"](index,a1,a2,a3,a4,a5,a6,a7);
  } catch(e) {
    stackRestore(sp);
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    Module["setThrew"](1, 0);
  }
}

function invoke_iiiiiiiii(index,a1,a2,a3,a4,a5,a6,a7,a8) {
  var sp = stackSave();
  try {
    return Module["dynCall_iiiiiiiii"](index,a1,a2,a3,a4,a5,a6,a7,a8);
  } catch(e) {
    stackRestore(sp);
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    Module["setThrew"](1, 0);
  }
}

function invoke_iiiiij(index,a1,a2,a3,a4,a5,a6) {
  var sp = stackSave();
  try {
    return Module["dynCall_iiiiij"](index,a1,a2,a3,a4,a5,a6);
  } catch(e) {
    stackRestore(sp);
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    Module["setThrew"](1, 0);
  }
}

function invoke_v(index) {
  var sp = stackSave();
  try {
    Module["dynCall_v"](index);
  } catch(e) {
    stackRestore(sp);
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    Module["setThrew"](1, 0);
  }
}

function invoke_vi(index,a1) {
  var sp = stackSave();
  try {
    Module["dynCall_vi"](index,a1);
  } catch(e) {
    stackRestore(sp);
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    Module["setThrew"](1, 0);
  }
}

function invoke_vid(index,a1,a2) {
  var sp = stackSave();
  try {
    Module["dynCall_vid"](index,a1,a2);
  } catch(e) {
    stackRestore(sp);
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    Module["setThrew"](1, 0);
  }
}

function invoke_vii(index,a1,a2) {
  var sp = stackSave();
  try {
    Module["dynCall_vii"](index,a1,a2);
  } catch(e) {
    stackRestore(sp);
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    Module["setThrew"](1, 0);
  }
}

function invoke_viii(index,a1,a2,a3) {
  var sp = stackSave();
  try {
    Module["dynCall_viii"](index,a1,a2,a3);
  } catch(e) {
    stackRestore(sp);
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    Module["setThrew"](1, 0);
  }
}

function invoke_viiid(index,a1,a2,a3,a4) {
  var sp = stackSave();
  try {
    Module["dynCall_viiid"](index,a1,a2,a3,a4);
  } catch(e) {
    stackRestore(sp);
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    Module["setThrew"](1, 0);
  }
}

function invoke_viiii(index,a1,a2,a3,a4) {
  var sp = stackSave();
  try {
    Module["dynCall_viiii"](index,a1,a2,a3,a4);
  } catch(e) {
    stackRestore(sp);
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    Module["setThrew"](1, 0);
  }
}

function invoke_viiiii(index,a1,a2,a3,a4,a5) {
  var sp = stackSave();
  try {
    Module["dynCall_viiiii"](index,a1,a2,a3,a4,a5);
  } catch(e) {
    stackRestore(sp);
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    Module["setThrew"](1, 0);
  }
}

function invoke_viiiiii(index,a1,a2,a3,a4,a5,a6) {
  var sp = stackSave();
  try {
    Module["dynCall_viiiiii"](index,a1,a2,a3,a4,a5,a6);
  } catch(e) {
    stackRestore(sp);
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    Module["setThrew"](1, 0);
  }
}

function invoke_viijii(index,a1,a2,a3,a4,a5,a6) {
  var sp = stackSave();
  try {
    Module["dynCall_viijii"](index,a1,a2,a3,a4,a5,a6);
  } catch(e) {
    stackRestore(sp);
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    Module["setThrew"](1, 0);
  }
}

Module.asmGlobalArg = {};

Module.asmLibraryArg = { "abort": abort, "assert": assert, "enlargeMemory": enlargeMemory, "getTotalMemory": getTotalMemory, "abortOnCannotGrowMemory": abortOnCannotGrowMemory, "invoke_di": invoke_di, "invoke_i": invoke_i, "invoke_ii": invoke_ii, "invoke_iii": invoke_iii, "invoke_iiii": invoke_iiii, "invoke_iiiii": invoke_iiiii, "invoke_iiiiid": invoke_iiiiid, "invoke_iiiiii": invoke_iiiiii, "invoke_iiiiiid": invoke_iiiiiid, "invoke_iiiiiii": invoke_iiiiiii, "invoke_iiiiiiii": invoke_iiiiiiii, "invoke_iiiiiiiii": invoke_iiiiiiiii, "invoke_iiiiij": invoke_iiiiij, "invoke_v": invoke_v, "invoke_vi": invoke_vi, "invoke_vid": invoke_vid, "invoke_vii": invoke_vii, "invoke_viii": invoke_viii, "invoke_viiid": invoke_viiid, "invoke_viiii": invoke_viiii, "invoke_viiiii": invoke_viiiii, "invoke_viiiiii": invoke_viiiiii, "invoke_viijii": invoke_viijii, "ClassHandle": ClassHandle, "ClassHandle_clone": ClassHandle_clone, "ClassHandle_delete": ClassHandle_delete, "ClassHandle_deleteLater": ClassHandle_deleteLater, "ClassHandle_isAliasOf": ClassHandle_isAliasOf, "ClassHandle_isDeleted": ClassHandle_isDeleted, "RegisteredClass": RegisteredClass, "RegisteredPointer": RegisteredPointer, "RegisteredPointer_deleteObject": RegisteredPointer_deleteObject, "RegisteredPointer_destructor": RegisteredPointer_destructor, "RegisteredPointer_fromWireType": RegisteredPointer_fromWireType, "RegisteredPointer_getPointee": RegisteredPointer_getPointee, "___assert_fail": ___assert_fail, "___cxa_allocate_exception": ___cxa_allocate_exception, "___cxa_begin_catch": ___cxa_begin_catch, "___cxa_find_matching_catch": ___cxa_find_matching_catch, "___cxa_pure_virtual": ___cxa_pure_virtual, "___cxa_throw": ___cxa_throw, "___cxa_uncaught_exception": ___cxa_uncaught_exception, "___gxx_personality_v0": ___gxx_personality_v0, "___lock": ___lock, "___map_file": ___map_file, "___resumeException": ___resumeException, "___setErrNo": ___setErrNo, "___syscall140": ___syscall140, "___syscall146": ___syscall146, "___syscall6": ___syscall6, "___syscall91": ___syscall91, "___unlock": ___unlock, "__addDays": __addDays, "__arraySum": __arraySum, "__embind_register_bool": __embind_register_bool, "__embind_register_class": __embind_register_class, "__embind_register_class_constructor": __embind_register_class_constructor, "__embind_register_class_function": __embind_register_class_function, "__embind_register_emval": __embind_register_emval, "__embind_register_float": __embind_register_float, "__embind_register_integer": __embind_register_integer, "__embind_register_memory_view": __embind_register_memory_view, "__embind_register_std_string": __embind_register_std_string, "__embind_register_std_wstring": __embind_register_std_wstring, "__embind_register_void": __embind_register_void, "__emscripten_traverse_stack": __emscripten_traverse_stack, "__emval_decref": __emval_decref, "__emval_register": __emval_register, "__formatString": __formatString, "__isLeapYear": __isLeapYear, "__reallyNegative": __reallyNegative, "_abort": _abort, "_embind_repr": _embind_repr, "_emscripten_get_callstack_js": _emscripten_get_callstack_js, "_emscripten_log": _emscripten_log, "_emscripten_log_js": _emscripten_log_js, "_emscripten_memcpy_big": _emscripten_memcpy_big, "_getenv": _getenv, "_llvm_ceil_f32": _llvm_ceil_f32, "_llvm_exp2_f32": _llvm_exp2_f32, "_llvm_fabs_f32": _llvm_fabs_f32, "_llvm_stackrestore": _llvm_stackrestore, "_llvm_stacksave": _llvm_stacksave, "_llvm_trap": _llvm_trap, "_pthread_cond_wait": _pthread_cond_wait, "_pthread_getspecific": _pthread_getspecific, "_pthread_key_create": _pthread_key_create, "_pthread_mutex_destroy": _pthread_mutex_destroy, "_pthread_once": _pthread_once, "_pthread_setspecific": _pthread_setspecific, "_strftime": _strftime, "_strftime_l": _strftime_l, "_time": _time, "constNoSmartPtrRawPointerToWireType": constNoSmartPtrRawPointerToWireType, "count_emval_handles": count_emval_handles, "craftInvokerFunction": craftInvokerFunction, "createNamedFunction": createNamedFunction, "downcastPointer": downcastPointer, "embind__requireFunction": embind__requireFunction, "embind_init_charCodes": embind_init_charCodes, "ensureOverloadTable": ensureOverloadTable, "exposePublicSymbol": exposePublicSymbol, "extendError": extendError, "floatReadValueFromPointer": floatReadValueFromPointer, "flushPendingDeletes": flushPendingDeletes, "genericPointerToWireType": genericPointerToWireType, "getBasestPointer": getBasestPointer, "getInheritedInstance": getInheritedInstance, "getInheritedInstanceCount": getInheritedInstanceCount, "getLiveInheritedInstances": getLiveInheritedInstances, "getShiftFromSize": getShiftFromSize, "getTypeName": getTypeName, "get_first_emval": get_first_emval, "heap32VectorToArray": heap32VectorToArray, "init_ClassHandle": init_ClassHandle, "init_RegisteredPointer": init_RegisteredPointer, "init_embind": init_embind, "init_emval": init_emval, "integerReadValueFromPointer": integerReadValueFromPointer, "makeClassHandle": makeClassHandle, "makeLegalFunctionName": makeLegalFunctionName, "new_": new_, "nonConstNoSmartPtrRawPointerToWireType": nonConstNoSmartPtrRawPointerToWireType, "readLatin1String": readLatin1String, "registerType": registerType, "replacePublicSymbol": replacePublicSymbol, "runDestructor": runDestructor, "runDestructors": runDestructors, "setDelayFunction": setDelayFunction, "shallowCopyInternalPointer": shallowCopyInternalPointer, "simpleReadValueFromPointer": simpleReadValueFromPointer, "throwBindingError": throwBindingError, "throwInstanceAlreadyDeleted": throwInstanceAlreadyDeleted, "throwInternalError": throwInternalError, "throwUnboundTypeError": throwUnboundTypeError, "upcastPointer": upcastPointer, "whenDependentTypesAreResolved": whenDependentTypesAreResolved, "DYNAMICTOP_PTR": DYNAMICTOP_PTR, "tempDoublePtr": tempDoublePtr, "ABORT": ABORT, "STACKTOP": STACKTOP, "STACK_MAX": STACK_MAX };
// EMSCRIPTEN_START_ASM
var asm =Module["asm"]// EMSCRIPTEN_END_ASM
(Module.asmGlobalArg, Module.asmLibraryArg, buffer);

var __GLOBAL__sub_I_AudioEngineCommon_cpp = Module["__GLOBAL__sub_I_AudioEngineCommon_cpp"] = asm["__GLOBAL__sub_I_AudioEngineCommon_cpp"];
var __GLOBAL__sub_I_DSP_cpp = Module["__GLOBAL__sub_I_DSP_cpp"] = asm["__GLOBAL__sub_I_DSP_cpp"];
var __GLOBAL__sub_I_MIDIParser_cpp = Module["__GLOBAL__sub_I_MIDIParser_cpp"] = asm["__GLOBAL__sub_I_MIDIParser_cpp"];
var __GLOBAL__sub_I_MusicUtils_cpp = Module["__GLOBAL__sub_I_MusicUtils_cpp"] = asm["__GLOBAL__sub_I_MusicUtils_cpp"];
var __GLOBAL__sub_I_VASynthAW_cpp = Module["__GLOBAL__sub_I_VASynthAW_cpp"] = asm["__GLOBAL__sub_I_VASynthAW_cpp"];
var __GLOBAL__sub_I_VASynth_cpp = Module["__GLOBAL__sub_I_VASynth_cpp"] = asm["__GLOBAL__sub_I_VASynth_cpp"];
var __GLOBAL__sub_I_bind_cpp = Module["__GLOBAL__sub_I_bind_cpp"] = asm["__GLOBAL__sub_I_bind_cpp"];
var __ZSt18uncaught_exceptionv = Module["__ZSt18uncaught_exceptionv"] = asm["__ZSt18uncaught_exceptionv"];
var ___cxa_can_catch = Module["___cxa_can_catch"] = asm["___cxa_can_catch"];
var ___cxa_is_pointer_type = Module["___cxa_is_pointer_type"] = asm["___cxa_is_pointer_type"];
var ___errno_location = Module["___errno_location"] = asm["___errno_location"];
var ___getTypeName = Module["___getTypeName"] = asm["___getTypeName"];
var _emscripten_replace_memory = Module["_emscripten_replace_memory"] = asm["_emscripten_replace_memory"];
var _free = Module["_free"] = asm["_free"];
var _llvm_bswap_i32 = Module["_llvm_bswap_i32"] = asm["_llvm_bswap_i32"];
var _malloc = Module["_malloc"] = asm["_malloc"];
var _memcpy = Module["_memcpy"] = asm["_memcpy"];
var _memmove = Module["_memmove"] = asm["_memmove"];
var _memset = Module["_memset"] = asm["_memset"];
var _pthread_cond_broadcast = Module["_pthread_cond_broadcast"] = asm["_pthread_cond_broadcast"];
var _pthread_mutex_lock = Module["_pthread_mutex_lock"] = asm["_pthread_mutex_lock"];
var _pthread_mutex_unlock = Module["_pthread_mutex_unlock"] = asm["_pthread_mutex_unlock"];
var _sbrk = Module["_sbrk"] = asm["_sbrk"];
var _strlen = Module["_strlen"] = asm["_strlen"];
var establishStackSpace = Module["establishStackSpace"] = asm["establishStackSpace"];
var getTempRet0 = Module["getTempRet0"] = asm["getTempRet0"];
var runPostSets = Module["runPostSets"] = asm["runPostSets"];
var setTempRet0 = Module["setTempRet0"] = asm["setTempRet0"];
var setThrew = Module["setThrew"] = asm["setThrew"];
var stackAlloc = Module["stackAlloc"] = asm["stackAlloc"];
var stackRestore = Module["stackRestore"] = asm["stackRestore"];
var stackSave = Module["stackSave"] = asm["stackSave"];
var dynCall_di = Module["dynCall_di"] = asm["dynCall_di"];
var dynCall_i = Module["dynCall_i"] = asm["dynCall_i"];
var dynCall_ii = Module["dynCall_ii"] = asm["dynCall_ii"];
var dynCall_iii = Module["dynCall_iii"] = asm["dynCall_iii"];
var dynCall_iiii = Module["dynCall_iiii"] = asm["dynCall_iiii"];
var dynCall_iiiii = Module["dynCall_iiiii"] = asm["dynCall_iiiii"];
var dynCall_iiiiid = Module["dynCall_iiiiid"] = asm["dynCall_iiiiid"];
var dynCall_iiiiii = Module["dynCall_iiiiii"] = asm["dynCall_iiiiii"];
var dynCall_iiiiiid = Module["dynCall_iiiiiid"] = asm["dynCall_iiiiiid"];
var dynCall_iiiiiii = Module["dynCall_iiiiiii"] = asm["dynCall_iiiiiii"];
var dynCall_iiiiiiii = Module["dynCall_iiiiiiii"] = asm["dynCall_iiiiiiii"];
var dynCall_iiiiiiiii = Module["dynCall_iiiiiiiii"] = asm["dynCall_iiiiiiiii"];
var dynCall_iiiiij = Module["dynCall_iiiiij"] = asm["dynCall_iiiiij"];
var dynCall_v = Module["dynCall_v"] = asm["dynCall_v"];
var dynCall_vi = Module["dynCall_vi"] = asm["dynCall_vi"];
var dynCall_vid = Module["dynCall_vid"] = asm["dynCall_vid"];
var dynCall_vii = Module["dynCall_vii"] = asm["dynCall_vii"];
var dynCall_viii = Module["dynCall_viii"] = asm["dynCall_viii"];
var dynCall_viiid = Module["dynCall_viiid"] = asm["dynCall_viiid"];
var dynCall_viiii = Module["dynCall_viiii"] = asm["dynCall_viiii"];
var dynCall_viiiii = Module["dynCall_viiiii"] = asm["dynCall_viiiii"];
var dynCall_viiiiii = Module["dynCall_viiiiii"] = asm["dynCall_viiiiii"];
var dynCall_viijii = Module["dynCall_viijii"] = asm["dynCall_viijii"];
;



// === Auto-generated postamble setup entry stuff ===

Module['asm'] = asm;













































































/**
 * @constructor
 * @extends {Error}
 * @this {ExitStatus}
 */
function ExitStatus(status) {
  this.name = "ExitStatus";
  this.message = "Program terminated with exit(" + status + ")";
  this.status = status;
};
ExitStatus.prototype = new Error();
ExitStatus.prototype.constructor = ExitStatus;

var initialStackTop;
var calledMain = false;

dependenciesFulfilled = function runCaller() {
  // If run has never been called, and we should call run (INVOKE_RUN is true, and Module.noInitialRun is not false)
  if (!Module['calledRun']) run();
  if (!Module['calledRun']) dependenciesFulfilled = runCaller; // try this again later, after new deps are fulfilled
}





/** @type {function(Array=)} */
function run(args) {
  args = args || Module['arguments'];

  if (runDependencies > 0) {
    return;
  }


  preRun();

  if (runDependencies > 0) return; // a preRun added a dependency, run will be called later
  if (Module['calledRun']) return; // run may have just been called through dependencies being fulfilled just in this very frame

  function doRun() {
    if (Module['calledRun']) return; // run may have just been called while the async setStatus time below was happening
    Module['calledRun'] = true;

    if (ABORT) return;

    ensureInitRuntime();

    preMain();

    if (Module['onRuntimeInitialized']) Module['onRuntimeInitialized']();


    postRun();
  }

  if (Module['setStatus']) {
    Module['setStatus']('Running...');
    setTimeout(function() {
      setTimeout(function() {
        Module['setStatus']('');
      }, 1);
      doRun();
    }, 1);
  } else {
    doRun();
  }
}
Module['run'] = run;


function exit(status, implicit) {

  // if this is just main exit-ing implicitly, and the status is 0, then we
  // don't need to do anything here and can just leave. if the status is
  // non-zero, though, then we need to report it.
  // (we may have warned about this earlier, if a situation justifies doing so)
  if (implicit && Module['noExitRuntime'] && status === 0) {
    return;
  }

  if (Module['noExitRuntime']) {
  } else {

    ABORT = true;
    EXITSTATUS = status;
    STACKTOP = initialStackTop;

    exitRuntime();

    if (Module['onExit']) Module['onExit'](status);
  }

  Module['quit'](status, new ExitStatus(status));
}

var abortDecorators = [];

function abort(what) {
  if (Module['onAbort']) {
    Module['onAbort'](what);
  }

  if (what !== undefined) {
    out(what);
    err(what);
    what = JSON.stringify(what)
  } else {
    what = '';
  }

  ABORT = true;
  EXITSTATUS = 1;

  throw 'abort(' + what + '). Build with -s ASSERTIONS=1 for more info.';
}
Module['abort'] = abort;

// {{PRE_RUN_ADDITIONS}}

if (Module['preInit']) {
  if (typeof Module['preInit'] == 'function') Module['preInit'] = [Module['preInit']];
  while (Module['preInit'].length > 0) {
    Module['preInit'].pop()();
  }
}


Module["noExitRuntime"] = true;

run();

// {{POST_RUN_ADDITIONS}}





// {{MODULE_ADDITIONS}}



class VASynthProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super(options); // The super constructor call is required

    const {
      channelCount
    } = options;

    this.vaSynth = new libvasynthaw.VASynthAW();
    this.vaSynth.init(sampleRate, channelCount); // sampleRate is AudioWorkletGlobalScope

    // Audio block size for AudioWorklet is 128
    this.dataPtr = libvasynthaw._malloc(128 * 4 * channelCount);
    this.buf = new Float32Array(
      libvasynthaw.HEAPF32.buffer,
      this.dataPtr,
      128 * channelCount
    );

    this.disabled = false;
    this.numCh = channelCount;
    this.port.onmessage = ({ data }) => {
       if (data.message === 'disable') {
         this.disabled = true;
         libvasynthaw._free(this.dataPtr);
         this.vaSynth.delete();
       } else {
         this.configureSynth(data);
       }
    }

  }

  configureSynth({
    id = console.error("Parameter name is required"),
    val = console.error("Parameter value is required")
  }) {
    if (id === "MIDI") {
      const msg = String.fromCharCode.apply(null, val.msg); // byte array to string
      const offset = val.offset;
      this.vaSynth.queueEvent(msg, offset);
    } else if (id === "loadPreset") {
      this.vaSynth.loadPresetJSON(val.json);
    } else {
      console.assert(val.toString, "Parameter value must be stringifiable");
      this.vaSynth.setParam(id, val.toString());
    }
  }

  process(inputs, outputs, parameters) {

//    console.log(currentTime);
    if (this.disabled) {
        return false;
    }

    const output = outputs[0];

    // Audio signal in Web Audio API is not interleaved format
    // If you want to make it work in stereo, the signal should be converted into interleaved format
    const nFrame = output[0].length;

    this.vaSynth.generate(this.buf.byteOffset, nFrame);

    // Deinterleave
    for (let i = 0, idx = 0; i < nFrame; ++i) {
      for (let ch = 0; ch < this.numCh; ++ch) {
        output[ch][i] = this.buf[idx++];
      }
    }

    return true;
  }
}

registerProcessor("vasynth-processor", VASynthProcessor);



  return libvasynthaw;
}();
if (typeof exports === 'object' && typeof module === 'object')
    module.exports = libvasynthaw;
  else if (typeof define === 'function' && define['amd'])
    define([], function() { return libvasynthaw; });
  else if (typeof exports === 'object')
    exports["libvasynthaw"] = libvasynthaw;

