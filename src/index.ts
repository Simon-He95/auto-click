import { addEventListener, getLineText, setSelection } from '@vscode-use/utils'
import type { ExtensionContext } from 'vscode'
import { window } from 'vscode'

export function activate(context: ExtensionContext) {
  let timer: any = null
  let isChanging = false
  const STOP_REG = /[\s"\>\<\/{},':;\(\)@=]/
  context.subscriptions.push(addEventListener('selection-change', (e) => {
    if (timer)
      clearTimeout(timer)
    if (isChanging)
      return
    const selections = e.selections
    if (selections.length !== 1)
      return
    const selection = selections[0]
    if (selection.start.line === selection.end.line && selection.start.character === selection.end.character) {
      // 单击，如果单机超过500ms，则自动选中多个内容
      let start = selection.start.character
      const line: number = selection.start.line
      const lineText = getLineText(selection.start.line)
      while (!STOP_REG.test(lineText[start - 1]) && start > 0)
        start--
      let end = selection.end.character
      while (!STOP_REG.test(lineText[end]) && end < lineText.length)
        end++
      if ((start === selection.start.character) && (end === selection.end.character))
        return

      const newStart: [number, number] = [line, +start]
      const newEnd: [number, number] = [line, +end]
      timer = setTimeout(() => {
        const editor = window.activeTextEditor?.document
        if (!editor)
          return
        setSelection(newStart, newEnd)
      }, 500)
      return
    }
    let start = selection.start.character
    const line: number = selection.start.line
    const lineText = getLineText(selection.start.line)
    while (!STOP_REG.test(lineText[start - 1]) && start > 0)
      start--
    let end = selection.end.character
    while (!STOP_REG.test(lineText[end]) && end < lineText.length)
      end++
    if ((start === selection.start.character) && (end === selection.end.character))
      return

    const newStart: [number, number] = [line, +start]
    const newEnd: [number, number] = [line, +end]

    // 如果间隔500ms没有新的改变则选中大面积
    timer = setTimeout(() => {
      const editor = window.activeTextEditor?.document
      if (!editor)
        return
      setSelection(newStart, newEnd)
    }, 500)
  }))
  context.subscriptions.push(addEventListener('text-change', () => {
    isChanging = true
    if (timer)
      clearTimeout(timer)
    setTimeout(() => isChanging = false, 50)
  }))
}

export function deactivate() {

}
