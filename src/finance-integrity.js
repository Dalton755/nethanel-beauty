const moneyFormatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

function parseMoney(text) {
  const normalized = String(text || '')
    .replace(/[^0-9,.-]/g, '')
    .replace(/\./g, '')
    .replace(',', '.')
  const value = Number(normalized)
  return Number.isFinite(value) ? value : 0
}

function formatMoney(value) {
  return moneyFormatter.format(Number(value || 0))
}

function enhanceProductCostForm(form) {
  if (!form || form.dataset.zaiaCostEnhanced === 'true') return
  const costInput = form.querySelector('[name="cost"]')
  const unitSelect = form.querySelector('[name="unit"]')
  if (!costInput || !unitSelect) return

  form.dataset.zaiaCostEnhanced = 'true'
  costInput.step = '0.0001'
  costInput.min = '0'
  costInput.inputMode = 'decimal'

  const costField = costInput.closest('.field')
  const costRow = costField?.closest('.row')
  const costLabel = costField?.querySelector('label')

  const helper = document.createElement('div')
  helper.className = 'helper'
  helper.dataset.zaiaUnitCostHelper = 'true'
  costField?.appendChild(helper)

  const calculator = document.createElement('div')
  calculator.className = 'row'
  calculator.dataset.zaiaCostCalculator = 'true'
  calculator.innerHTML = `
    <div class="field">
      <label>Quantidade da embalagem</label>
      <input name="packageQuantityHelper" type="number" min="0" step="0.001" inputmode="decimal" placeholder="Ex.: 500">
    </div>
    <div class="field">
      <label>Preço da embalagem</label>
      <input name="packagePriceHelper" type="number" min="0" step="0.01" inputmode="decimal" placeholder="Ex.: 30,00">
    </div>
  `

  const calcStatus = document.createElement('div')
  calcStatus.className = 'helper'
  calcStatus.dataset.zaiaCostCalculatorStatus = 'true'
  calculator.appendChild(calcStatus)
  costRow?.insertAdjacentElement('afterend', calculator)

  const quantityInput = calculator.querySelector('[name="packageQuantityHelper"]')
  const priceInput = calculator.querySelector('[name="packagePriceHelper"]')

  const refreshCopy = () => {
    const unit = unitSelect.value || 'un'
    if (costLabel) costLabel.textContent = `Custo por ${unit}`
    helper.textContent = `Este valor precisa ser o custo de 1 ${unit}. Se você sabe apenas o preço da embalagem, use a calculadora abaixo.`
  }

  const calculateUnitCost = () => {
    const quantity = Number(quantityInput?.value || 0)
    const packagePrice = Number(priceInput?.value || 0)
    if (!(quantity > 0) || !(packagePrice >= 0)) {
      calcStatus.textContent = ''
      return
    }
    const unitCost = Math.round((packagePrice / quantity) * 10000) / 10000
    costInput.value = unitCost.toFixed(4)
    calcStatus.textContent = `Custo calculado: ${formatMoney(unitCost)} por ${unitSelect.value || 'un'}. O financeiro usa esse valor no consumo dos serviços.`
  }

  unitSelect.addEventListener('change', () => {
    refreshCopy()
    calculateUnitCost()
  })
  quantityInput?.addEventListener('input', calculateUnitCost)
  priceInput?.addEventListener('input', calculateUnitCost)
  refreshCopy()
}

function enhanceFinanceCard(card) {
  if (!card || card.dataset.zaiaFinanceIntegrity === 'true') return
  card.dataset.zaiaFinanceIntegrity = 'true'

  const title = card.querySelector('h2')
  if (title && /lucro estimado/i.test(title.textContent || '')) {
    title.textContent = 'Resultado operacional'
    title.title = 'Receita dos serviços menos materiais consumidos, comissões e outras despesas do período.'
  }

  const rows = [...card.querySelectorAll('.finance-cost-stack > div')]
  const rowByLabel = matcher => rows.find(row => matcher.test(row.querySelector('span')?.textContent || ''))
  const materialsRow = rowByLabel(/^Materiais$/i)
  const commissionsRow = rowByLabel(/^Comissões$/i)
  const expensesRow = rowByLabel(/^(Despesas do período|Outras despesas)$/i)

  if (materialsRow?.querySelector('span')) {
    materialsRow.querySelector('span').textContent = 'Materiais consumidos'
  }

  if (expensesRow?.querySelector('span') && /Despesas do período/i.test(expensesRow.querySelector('span').textContent || '')) {
    const accrued = parseMoney(expensesRow.querySelector('b')?.textContent)
    const commissions = parseMoney(commissionsRow?.querySelector('b')?.textContent)
    const otherExpenses = Math.max(0, accrued - commissions)
    expensesRow.querySelector('span').textContent = 'Outras despesas'
    if (expensesRow.querySelector('b')) expensesRow.querySelector('b').textContent = formatMoney(otherExpenses)
  }
}

function enhanceAll() {
  document.querySelectorAll('#productForm').forEach(enhanceProductCostForm)
  document.querySelectorAll('.finance-profit-card').forEach(enhanceFinanceCard)
}

document.addEventListener('submit', event => {
  const form = event.target
  if (!(form instanceof HTMLFormElement) || form.id !== 'productForm') return
  const costInput = form.querySelector('[name="cost"]')
  const quantityInput = form.querySelector('[name="packageQuantityHelper"]')
  const priceInput = form.querySelector('[name="packagePriceHelper"]')
  const quantity = Number(quantityInput?.value || 0)
  const packagePrice = Number(priceInput?.value || 0)
  if (costInput && quantity > 0 && packagePrice >= 0) {
    const unitCost = Math.round((packagePrice / quantity) * 10000) / 10000
    costInput.value = unitCost.toFixed(4)
  }
}, true)

const observer = new MutationObserver(() => queueMicrotask(enhanceAll))
observer.observe(document.documentElement, { childList: true, subtree: true })
enhanceAll()
