// Machine Passport — WebMCP G0 harness (dev page: /g0.html)
// Registers ONE deterministic read-only tool, proves lifecycle, exposes window.__g0().
// Runtime surface verified on Chrome 152: ModelContext prototype exposes
// registerTool, getTools, executeTool (takes RegisteredTool + args JSON string), ontoolchange.

/* eslint-env browser */

const TOOL = {
  name: 'get_demo_status',
  title: 'Machine Passport demo status',
  description:
    'Deterministic demo status probe for the Machine Passport app. ' +
    'Returns app identity, WebMCP availability, and a clear no-mutation marker. ' +
    'No network access, no machine state, no mutation.',
  inputSchema: {
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
  annotations: {
    readOnlyHint: true,
    untrustedContentHint: false,
  },
  execute: async () =>
    JSON.stringify({
      status: 'ok',
      tool: 'get_demo_status',
      app: 'machine-passport-webmcp',
      mutation: 'none',
      webmcpSurface: 'registerTool/getTools/executeTool (Chrome 152)',
    }),
};

const EXPECTED = { status: 'ok', tool: 'get_demo_status', mutation: 'none' };

function sanitizeTool(t) {
  if (!t) return null;
  let schema = t.inputSchema;
  if (typeof schema === 'string') {
    try { schema = JSON.parse(schema); } catch { /* keep raw string */ }
  }
  return {
    name: t.name,
    title: t.title,
    description: typeof t.description === 'string' ? t.description.slice(0, 220) : String(t.description),
    inputSchemaShape: schema
      ? { type: schema.type, props: schema.properties ? Object.keys(schema.properties) : [] }
      : { raw: schema === null ? 'null' : typeof t.inputSchema },
    annotations: t.annotations,
  };
}

async function probeInvocation() {
  const ctx = document.modelContext || {};
  const attempts = [];
  if (typeof ctx.executeTool === 'function' && typeof ctx.getTools === 'function') {
    try {
      const tools = await ctx.getTools();
      const tool = (tools || []).find((t) => t.name === 'get_demo_status');
      attempts.push({ path: 'getTools()->find(name)', ok: !!tool });
      if (tool) {
        try {
          const out = await ctx.executeTool(tool, '{}');
          attempts.push({ path: "executeTool(tool, '{}')", ok: true });
          return { surface: 'executeTool(RegisteredTool, argsJsonString)', output: out, attempts };
        } catch (e) {
          attempts.push({ path: "executeTool(tool, '{}')", ok: false, error: String(e).slice(0, 200) });
        }
      }
    } catch (e) {
      attempts.push({ path: 'getTools()', ok: false, error: String(e).slice(0, 200) });
    }
  }
  return { surface: null, output: null, attempts };
}

function unwrapPayload(output) {
  if (typeof output === 'string') return output;
  if (Array.isArray(output) && output[0] && typeof output[0].text === 'string') return output[0].text;
  if (output && Array.isArray(output.content) && output.content[0] && typeof output.content[0].text === 'string') {
    return output.content[0].text;
  }
  return null;
}

function dom(sel, text) {
  const el = document.querySelector(sel);
  if (el && text !== undefined) el.textContent = text;
  return el;
}

function logStep(stepLabel, ok, detail) {
  const li = document.createElement('li');
  li.className = ok ? 'step-ok' : 'step-fail';
  li.textContent = `${ok ? 'PASS' : 'FAIL'} — ${stepLabel}`;
  if (detail) {
    const pre = document.createElement('pre');
    pre.className = 'code small';
    pre.textContent = detail;
    li.appendChild(pre);
  }
  document.querySelector('#steps').appendChild(li);
}

async function runG0() {
  const steps = document.querySelector('#steps');
  steps.innerHTML = '';
  const result = {
    overall: 'FAIL',
    steps: {},
    webmcp: typeof document.modelContext,
    detail: {},
  };

  result.steps.s1_exists = !!(window.document && document.modelContext);
  logStep('document.modelContext exists', result.steps.s1_exists,
    `typeof document.modelContext = ${typeof document.modelContext}`);

  const mainController = new AbortController();
  try {
    await document.modelContext.registerTool(TOOL, { signal: mainController.signal });
    result.steps.s2_register = true;
  } catch (e) {
    result.steps.s2_register = false;
    result.detail.registerError = String(e && e.stack || e);
  }
  logStep('register get_demo_status', result.steps.s2_register,
    result.detail.registerError || 'resolved');

  try {
    const tools = await document.modelContext.getTools();
    const names = (tools || []).map((t) => t.name);
    result.steps.s3_discover = names.includes('get_demo_status');
    result.detail.tools = names;
    result.detail.descriptor = sanitizeTool((tools || []).find((t) => t.name === 'get_demo_status'));
  } catch (e) {
    result.steps.s3_discover = false;
    result.detail.discoverError = String(e);
  }
  logStep('getTools() shows it', result.steps.s3_discover,
    `tools = ${JSON.stringify(result.detail.tools)}`);

  try {
    const inv = await probeInvocation();
    result.steps.s4_invoke = !!inv.surface && inv.output !== null && inv.output !== undefined;
    result.detail.surface = inv.surface;
    result.detail.rawOutput = (() => {
      const s = String(inv.output);
      return s.length > 400 ? s.slice(0, 400) + '…' : s;
    })();
    result.detail.invokeAttempts = inv.attempts;
  } catch (e) {
    result.steps.s4_invoke = false;
    result.detail.invokeError = String(e);
  }
  logStep('execute/invoke surface', result.steps.s4_invoke,
    `surface=${result.detail.surface} error=${result.detail.invokeError || 'none'}`);

  try {
    const payload = unwrapPayload(result.detail.rawOutput);
    let parsed = null;
    if (typeof payload === 'string') parsed = JSON.parse(payload);
    result.steps.s5_deterministic = !!parsed &&
      parsed.status === EXPECTED.status &&
      parsed.tool === EXPECTED.tool &&
      parsed.mutation === EXPECTED.mutation;
    result.detail.parsed = parsed;
  } catch (e) {
    result.steps.s5_deterministic = false;
    result.detail.parseError = String(e);
  }
  logStep('deterministic JSON return', result.steps.s5_deterministic,
    JSON.stringify(result.detail.parsed || { error: result.detail.parseError }));

  try {
    const tools2 = await document.modelContext.getTools();
    result.steps.s6_rediscover = (tools2 || []).some((t) => t.name === 'get_demo_status');
  } catch (e) {
    result.steps.s6_rediscover = false;
    result.detail.rediscoverError = String(e);
  }
  logStep('re-discovery (fresh call) finds it', result.steps.s6_rediscover,
    'same store; agent-side Inspector check is human/manual');

  try {
    const tools3 = await document.modelContext.getTools();
    const d3 = sanitizeTool((tools3 || []).find((t) => t.name === 'get_demo_status'));
    result.steps.s7_nl_selection = !!(d3 &&
      typeof d3.description === 'string' && d3.description.length > 0 &&
      d3.inputSchemaShape && d3.inputSchemaShape.type === 'object');
    result.detail.nlProxy = {
      descriptionLength: d3 ? d3.description.length : 0,
      schemaShape: d3 ? d3.inputSchemaShape : null,
      method: 'PROXY: description+schema present; real NL prompt requires human in Chrome',
    };
  } catch (e) {
    result.steps.s7_nl_selection = false;
    result.detail.nlError = String(e);
  }
  logStep('NL-selection preconditions (proxy)', result.steps.s7_nl_selection,
    JSON.stringify(result.detail.nlProxy));

  try {
    mainController.abort();
    result.steps.s8_abort = true;
  } catch (e) {
    result.steps.s8_abort = false;
    result.detail.abortError = String(e);
  }
  logStep('abort controller', result.steps.s8_abort, 'controller.abort() called');

  try {
    const toolsAfter = await document.modelContext.getTools();
    result.steps.s9_gone = !(toolsAfter || []).some((t) => t.name === 'get_demo_status');
    result.detail.afterAbort = (toolsAfter || []).map((t) => t.name);
  } catch (e) {
    result.steps.s9_gone = false;
    result.detail.goneError = String(e);
  }
  logStep('tool disappears after abort', result.steps.s9_gone,
    `tools after abort = ${JSON.stringify(result.detail.afterAbort)}`);

  try {
    const c2 = new AbortController();
    await document.modelContext.registerTool(TOOL, { signal: c2.signal });
    const toolsAgain = await document.modelContext.getTools();
    const count = (toolsAgain || []).filter((t) => t.name === 'get_demo_status').length;
    result.steps.s10_reregister = count === 1;
    result.detail.reregisterCount = count;
    c2.abort();
  } catch (e) {
    result.steps.s10_reregister = false;
    result.detail.reregisterError = String(e);
  }
  logStep('re-register cleanly (no duplicate)', result.steps.s10_reregister,
    `count after re-register = ${result.detail.reregisterCount}`);

  const required = ['s1_exists', 's2_register', 's3_discover', 's4_invoke', 's5_deterministic',
    's6_rediscover', 's7_nl_selection', 's8_abort', 's9_gone', 's10_reregister'];
  const failed = required.filter((k) => result.steps[k] !== true);
  result.overall = failed.length === 0 ? 'PASS' : 'FAIL';
  result.failedSteps = failed;
  dom('#result', JSON.stringify(result, null, 2));
  return result;
}

(async function init() {
  if (document.modelContext) {
    await runG0();
  } else {
    dom('#mc-presence', 'NOT AVAILABLE');
    dom('#mc-detail', 'document.modelContext is undefined on this page/origin.');
  }
  window.__g0 = runG0;
  document.querySelector('#run').addEventListener('click', () => runG0());
})();