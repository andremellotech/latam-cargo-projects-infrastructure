/* Roteiro demonstrativo: transicoes reversiveis, sem DOM ou persistencia. */
(function (root) {
  'use strict';
  const steps = [
    {
      label: 'Contexto e decisão', view: 'executive',
      context: 'Caso demonstrativo de Santiago. Os dados de gestão são fictícios; as hipóteses exigem validação.',
      prompt: 'Eu começaria pela decisão: como proteger a operação de frio durante a safra e conectar capacidade, prazo e investimento?'
    },
    {
      label: 'Projeto P07', view: 'projects', target: { proj: 'P07' },
      context: 'Abra o detalhe do P07 e relacione a previsão de entrega à necessidade operacional de Santiago.',
      prompt: 'Eu compararia a linha de base com a previsão de entrega, identificaria o caminho crítico e avaliaria implantação por módulos e capacidade temporária.'
    },
    {
      label: 'Riscos e resposta', view: 'risks',
      context: 'Na carteira de riscos, examine os itens ligados a Santiago e ao P07: causa, impacto, resposta e responsável.',
      prompt: 'Eu priorizaria os riscos à continuidade e à qualidade, validaria as respostas com a operação e definiria responsáveis e gatilhos de acompanhamento.'
    },
    {
      label: 'Business case BC3', view: 'business', target: { caseId: 'BC3' },
      context: 'O BC3 está vinculado ao P07. Leia o veredito; use “Abrir no simulador” no detalhe do BC3 para testar as premissas antes de recomendar a decisão.',
      prompt: 'Eu compararia o investimento com a alternativa temporária, testaria demanda e custos e explicitaria quais premissas podem mudar a recomendação.'
    },
    {
      label: 'Governança e próximos passos', view: 'executive', anchor: 'actionPlan',
      context: 'Use o plano demonstrativo como ponto de partida para discutir execução, melhoria contínua e governança de CAPEX.',
      prompt: 'Validaria maturidade e responsáveis, conduziria workshop de priorização e definiria gates, critérios de aceite e medição de benefícios.'
    }
  ];
  const clone = (value) => JSON.parse(JSON.stringify(value));

  function create(state, data) {
    const available = !!(data.sets && data.sets.demo);
    let snapshot = null, index = 0;
    function select(next) {
      if (!snapshot || !Number.isInteger(next) || next < 0 || next >= steps.length) return false;
      index = next;
      const step = steps[index];
      Object.assign(state, { mode: 'demo', view: step.view, country: 'all', layers: [], minScore: 0 }, step.target || {});
      return true;
    }
    return {
      available,
      get active() { return snapshot !== null; },
      get index() { return index; },
      get step() { return steps[index]; },
      start() {
        if (!available || snapshot) return false;
        snapshot = clone(state);
        return select(0);
      },
      select,
      next() { return select(index + 1); },
      previous() { return select(index - 1); },
      aligned() {
        const step = steps[index];
        return snapshot !== null && state.mode === 'demo' && state.view === step.view && state.country === 'all' && !state.layers.length && state.minScore === 0 && Object.keys(step.target || {}).every((key) => state[key] === step.target[key]);
      },
      stop() {
        if (!snapshot) return false;
        Object.keys(state).forEach((key) => { delete state[key]; });
        Object.assign(state, snapshot);
        snapshot = null;
        return true;
      }
    };
  }
  root.Interview = { steps, create };
})(window);
