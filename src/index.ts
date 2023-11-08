import { addEventListener, getLineText, setSelection } from '@vscode-use/utils'
import { ExtensionContext } from 'vscode'
export function activate(context: ExtensionContext) {
  let pre: string | null = null
  let count = 0
  context.subscriptions.push(addEventListener('selection-change', e => {
    const selection = e.selections[0]
    if (!selection) {
      pre = null
      return
    }
    const active = `${selection.active.line}-${selection.active.character}`
    console.log({ pre, active })
    if (!pre) {
      pre = active
      count = 1
    } else if (isInSamePos(pre, active)) {
      count++
      if (count === 2) {
        // 双击同一位置
      } else if (count === 3) {
        // 三击同一位置
        if (selection.start.line === selection.end.line && selection.start.character === selection.end.character) {
          count = 1
          debugger
          return
        }
        let start = selection.start.character
        const lineText = getLineText(selection.start.line)
        while (!/\s"\>\<\//.test(lineText[start]) && start > 0) {
          start--
        }
        let end = selection.end.character
        while (!/\s"\>\<\//.test(lineText[end]) && end < lineText.length) {
          end++
        }
        setSelection([selection.start.line, start], [selection.end.line, end])
        count = 0
        debugger
      }
    } else {
      pre = active
      count = 1
    }

  }))
}

export function deactivate() {

}

function isInSamePos(pre: string, cur: string) {
  const [preLine, preColumn] = pre.split('-')
  const [curLine, curColumn] = cur.split('-')
  if (preLine !== curLine)
    return false
  const lineText = getLineText(+preLine)
  const min = Math.min(+preColumn, +curColumn)
  const max = Math.max(+preColumn, +curColumn)
  for (let i = min; i < max; i++) {
    const mid = lineText[i]
    if (!/[\w_]/.test(mid))
      return false
  }
  return true
}
