import { addEventListener, getLineText, setSelection } from '@vscode-use/utils'
import type { ExtensionContext } from 'vscode'
import { window } from 'vscode'

export function activate(context: ExtensionContext) {
  let timer: any = null
  let isChanging = false
  const STOP_REG = /[\s"\>\<\/{},':;\.\(\)@=+[\]\!`]/
  let preKind: number | null | undefined = null
  context.subscriptions.push(addEventListener('selection-change', (e) => {
    if (timer)
      clearTimeout(timer)

    if (isChanging)
      return
    const selections = e.selections
    if (selections.length !== 1)
      return
    const selection = selections[0]

    if (selection.start.line !== selection.end.line)
      return

    if (preKind === null) {
      preKind = e.kind
    }
    else if ((preKind === 2) && (preKind === e.kind)) {
      // 使用鼠标拖拽，就不干涉
      preKind = e.kind
      return
    }
    else if ((preKind === 1) && (preKind === e.kind)) {
      // 键盘一个一个移动，也不干涉
      preKind = e.kind
      return
    }
    else if ((preKind === undefined) && (e.kind === 1)) {
      // 判断可能是要单独指定到某一个，也不干涉
      preKind = e.kind
      return
    }
    else {
      preKind = undefined
    }
    if (selection.start.line === selection.end.line && selection.start.character === selection.end.character) {
      // 单击，如果单机超过800ms，则自动选中多个内容
      let start = selection.start.character
      const line: number = selection.start.line
      const lineText = getLineText(selection.start.line)
      while (!STOP_REG.test(lineText[start - 1]) && start > 0)
        start--
      let end = selection.end.character
      while (!STOP_REG.test(lineText[end]) && end < lineText.length)
        end++

      if ((start === selection.start.character) || (end === selection.end.character)) {
        preKind = null
        return
      }

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
  let stop: any = null
  context.subscriptions.push(addEventListener('text-change', () => {
    isChanging = true
    if (timer)
      clearTimeout(timer)
    if (stop)
      clearTimeout(stop)
    stop = setTimeout(() =>
      isChanging = false
    , 500)
  }))
}

export function deactivate() {

}
