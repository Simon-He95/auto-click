import { addEventListener, getConfiguration, getLineText, setSelection, setSelections } from '@vscode-use/utils'
import type { ExtensionContext } from 'vscode'
import { window } from 'vscode'

// todo: 修复如果未有选中内容使用方向大跳，不触发自动事件
export function activate(context: ExtensionContext) {
  let timer: any = null
  let isChanging = false
  const STOP_REG = /[\s"\>\<\/{},':;\.\(\)@=+[\]\!`\?\$\|\&\#，。\*]/
  let preKind: number | null | undefined = null
  let preActive: any = null
  let preSelection: any = null
  let preSelections: any = null
  const second = getConfiguration('autoclick').get('second') as number
  const updateSecond = getConfiguration('autoclick').get('updateSecond') as number

  context.subscriptions.push(addEventListener('selection-change', (e) => {
    if (timer)
      clearTimeout(timer)

    const selections = e.selections
    const selection = selections[0]

    if (!preActive)
      preActive = selection.active

    if (isChanging)
      return

    if (selections.length !== 1) {
      preActive = null
      preKind = null
      // 多选
      // 自动选择附近相关的内容
      timer = setTimeout(() => {
        const newSelections = selections.map((s: any) => {
          const start = s.start
          const end = s.end
          let _start = start.character
          let _end = end.character
          let isReverse = false
          let flag = false
          const origin = { start: [start.line, start.character], end: [end.line, end.character] }
          if (start.line !== end.line)
            return origin
          const _lineText = getLineText(start.line)
          if ((e.kind !== 2) && (_start === start.character) && (end.character === start.character)) {
            // 在最左侧边缘未有选中值，不处理
            return origin
          }

          if ((e.kind !== 2) && (start.character === end.character) && (_end === _end.character)) {
            // 在最右侧边缘未有选中值，不处理
            return origin
          }
          // 如果有选中值了，看前一次该行的位置
          if (preSelections) {
            const target = preSelections.find(({ start: preStart, end: preEnd }: any) => ((preStart[0] === start.line) && (preStart[1] === _start)) || ((preEnd[0] === end.line) && (preEnd[1] === _end)))
            if (target && (target.start[1] < s.active.character) && (s.active.character < target.end[1])) {
              // 已经有选中值了，现在往会选了，也不处理
              return origin
            }
            else if (!target && e.kind === 2) {
              flag = true
            }
          }
          else {
            flag = true
          }
          if (_end > s.active.character) {
            // 从右往左选
            isReverse = true
          }
          if (isReverse || flag) {
            while (_start > 0 && !STOP_REG.test(_lineText[_start - 1]))
              _start--
          }

          if (!isReverse || flag) {
            while (_end < _lineText.length && !STOP_REG.test(_lineText[_end]))
              _end++
          }

          return { start: [start.line, _start], end: [end.line, _end], position: isReverse ? 'left' : 'right' }
        })

        preSelections = newSelections
        setSelections(newSelections)
      }, second)
      return
    }
    preSelections = null
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
    else {
      preKind = undefined
    }

    if (selection.start.line === selection.end.line && selection.start.character === selection.end.character) {
      // 单击，如果单机超过800ms，则自动选中多个内容
      preActive = selection.active
      preSelection = null
      if (e.kind !== 2) {
        preKind = null
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
      }, second)
      return
    }
    else if (preSelection) {
      // 有选中内容 如果选中内容在之前的选中之间则不触发
      const [start, end] = preSelection
      if (selection.active.character >= start.character && selection.active.character <= end.character) {
        preSelection = [selection.start, selection.end]
        return
      }
    }
    else {
      preSelection = [selection.start, selection.end]
    }
    let start = selection.start.character
    const line: number = selection.start.line
    const lineText = getLineText(selection.start.line)

    if (preSelection[0].character >= selection.active.character) {
      while (!STOP_REG.test(lineText[start - 1]) && start > 0)
        start--
    }

    let end = selection.end.character
    if (preSelection[1].character <= selection.active.character) {
      while (!STOP_REG.test(lineText[end]) && end < lineText.length)
        end++
    }
    if (+start === +selection.start.character && +end === +selection.end.character) {
      preKind = null
      preActive = selection.active
      preSelection = [selection.start, selection.end]
      return
    }
    const newStart: [number, number] = [line, +start]
    const newEnd: [number, number] = [line, +end]

    // 如果间隔500ms没有新的改变则选中大面积
    timer = setTimeout(() => {
      const editor = window.activeTextEditor?.document
      if (!editor)
        return

      if (!preSelection) {
        setSelection(newStart, newEnd)
      }
      else {
        const start = preSelection[0]
        if (preActive.line !== line) {
          preActive = null
          setSelection(newStart, newEnd)
        }
        else if (start.character >= selection.active.character) {
          setSelection(newStart, newEnd, 'left')
        }
        else {
          setSelection(newStart, newEnd)
        }
      }
    }, updateSecond)
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
  context.subscriptions.push(addEventListener('activeText-change', () => {
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
