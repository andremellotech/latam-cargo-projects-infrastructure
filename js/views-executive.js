/* Síntese da rede demonstrativa; preserva os filtros da navegação analítica. */
(function (root) {
  'use strict';
  const V = root.Views, H = V.H;
  V.TITLES.executive = ['Síntese de consultoria', 'Decisões prioritárias, alocação de capital e plano de execução para a rede.'];
  V.views.executive = (state, data) => {
    if (state.mode === 'public') return H.notice(state, data, 'Síntese de consultoria');
    const management = H.mg(state, data);
    if (state.mode !== 'demo' || !management || !management.meta || management.meta.synthetic !== true) {
      return '<section class="panel executive-notice"><h2>Síntese disponível somente no modo demonstração</h2><p>Para analisar os dados de gestão carregados, abra o Painel analítico.</p><button type="button" class="btn primary" data-goto="consultant">Abrir Painel analítico</button></section>';
    }
    return '<div class="consulting-summary">' + root.Consulting.render(management, { actions: true }) + '</div>';
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = V;
})(typeof window !== 'undefined' ? window : globalThis);
