"""Run with the Vite dev server: python3 tests/browser_smoke.py.
Requires Python Playwright and its Chromium browser. Artifacts go to /tmp.
"""
import json
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

URL = 'http://127.0.0.1:5173'
ARTIFACTS = Path('/tmp/guestworld-qa')
ARTIFACTS.mkdir(exist_ok=True)
SOLUTION = [5,3,4,6,7,8,9,1,2,6,7,2,1,9,5,3,4,8,1,9,8,3,4,2,5,6,7,8,5,9,7,6,1,4,2,3,4,2,6,8,5,3,7,9,1,7,1,3,9,2,4,8,5,6,9,6,1,5,3,7,2,8,4,2,8,7,4,1,9,6,3,5,3,4,5,2,8,6,1,7,9]

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={'width':1280,'height':800})
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.goto(URL)
    page.wait_for_load_state('networkidle')
    expect(page.get_by_role('heading',name='GUESTWORLD',exact=True)).to_be_visible()
    assert page.locator('.game-card img').evaluate_all('(images) => images.every(i => i.complete && i.naturalWidth === 1254)')
    page.screenshot(path=str(ARTIFACTS/'hub.png'),full_page=True)
    page.get_by_role('button',name='Orbit Word',exact=True).focus()
    page.keyboard.press('Enter')
    page.get_by_role('button',name='Classic',exact=False).click()
    expect(page.get_by_role('dialog')).to_be_visible()
    page.keyboard.press('Enter')
    expect(page.get_by_role('dialog')).to_have_count(0)
    page.keyboard.type('zzzzz')
    page.keyboard.press('Enter')
    assert page.evaluate('window.__store.getState().guesses.length') == 0
    page.keyboard.press('Backspace')
    assert page.evaluate('window.__store.getState().currentGuess') == 'zzzz'
    page.keyboard.press('Backspace')
    page.keyboard.press('Backspace')
    page.keyboard.press('Backspace')
    page.keyboard.press('Backspace')
    page.wait_for_load_state('networkidle')
    page.screenshot(path=str(ARTIFACTS/'orbit-word.png'),full_page=True)
    answer = page.evaluate('window.__store.getState().answer')
    page.keyboard.type(answer)
    page.keyboard.press('Enter')
    expect(page.get_by_role('heading',name='SOLVED',exact=True)).to_be_visible()
    page.get_by_role('button',name='Play Again').click()
    expect(page.get_by_role('dialog')).to_have_count(0)
    assert page.evaluate('window.__store.getState().guesses.length') == 0
    losing_guess = 'apple' if page.evaluate('window.__store.getState().answer') != 'apple' else 'chair'
    for _ in range(5):
        page.keyboard.type(losing_guess)
        page.keyboard.press('Enter')
    expect(page.get_by_role('heading',name='OUT OF GUESSES',exact=True)).to_be_visible()
    assert page.evaluate('window.__store.getState().guesses.length') == 5
    page.get_by_role('button',name='Play Again').click()
    # Enter on a focused navigation button must not also submit an invalid Word guess.
    page.get_by_role('button',name='Modes',exact=True).focus()
    page.keyboard.press('Enter')
    expect(page.get_by_role('heading',name='ORBIT WORD',exact=True)).to_be_visible()
    page.get_by_role('button',name='Timer',exact=False).click()
    page.get_by_role('button',name='Start',exact=True).click()
    page.get_by_role('button',name='How to play').click()
    assert page.evaluate('window.__store.getState().helpOpen')
    # Word mode retains its running clock during help.
    started = page.evaluate('window.__store.getState().startedAt')
    page.keyboard.press('Escape')
    assert page.evaluate('window.__store.getState().startedAt') == started
    page.get_by_role('button',name='Modes',exact=True).click()
    page.get_by_role('button',name='Back to games',exact=False).click()
    page.get_by_role('button',name='Sudoku',exact=True).click()
    expect(page.get_by_role('button',name='Expert',exact=False)).to_be_visible()
    page.screenshot(path=str(ARTIFACTS/'difficulty.png'),full_page=True)
    page.get_by_role('button',name='Beginner',exact=False).click()
    page.get_by_role('button',name='Start puzzle').click()
    expect(page.get_by_role('gridcell')).to_have_count(81)
    # Local dev module access is test-only; no production debug control is added.
    def state(expression):
        return page.evaluate("async () => { const url = performance.getEntriesByType('resource').find(e => new URL(e.name).pathname === '/src/games/sudoku/store.ts').name; const s = (await import(url)).useSudokuStore.getState(); return " + expression + "; }")
    cell = state('s.selected')
    page.get_by_role('button',name='Notes',exact=False).click()
    page.get_by_role('button',name='Enter 2',exact=True).click()
    assert state('s.notes[s.selected]') == 1 << 2
    page.get_by_role('button',name='Undo',exact=True).click()
    assert state('s.notes[s.selected]') == 0
    page.get_by_role('button',name='Notes',exact=False).click()
    digit = state('s.puzzle.solution[s.selected]')
    peer_digit = state('s.entries.find((n,i) => n && Math.floor(i/9) === Math.floor(s.selected/9))')
    page.locator(f'[data-cell="{cell}"]').click()
    page.keyboard.type(str(peer_digit))
    expect(page.locator('.board-status')).to_contain_text('Duplicate found')
    page.screenshot(path=str(ARTIFACTS/'conflict.png'),full_page=True)
    page.get_by_role('button',name='Erase',exact=True).click()
    assert state('s.entries[s.selected]') == 0
    page.get_by_role('button',name='Hint',exact=True).click()
    assert state('s.entries[s.selected]') == digit
    assert state('s.hintsUsed') == 1
    page.get_by_role('button',name='Undo',exact=True).click()
    assert state('s.hintsUsed') == 1
    assert state('s.entries[s.selected]') == 0
    page.get_by_role('button',name='How to play',exact=True).click()
    expect(page.get_by_role('dialog')).to_be_visible()
    paused = state('s.elapsedMs')
    assert state('s.runningSince') is None
    for _ in range(5):
        page.keyboard.press('Tab')
        assert page.evaluate("document.querySelector('dialog').contains(document.activeElement)")
    page.keyboard.press('Escape')
    assert state('s.runningSince') is not None
    assert state('s.elapsedMs') == paused
    expect(page.get_by_role('button',name='How to play',exact=True)).to_be_focused()
    page.get_by_role('button',name='Games',exact=True).click()
    expect(page.get_by_role('heading',name='Leave puzzle?',exact=True)).to_be_visible()
    assert state('s.runningSince') is None
    page.get_by_role('button',name='Keep playing').click()
    assert state('s.runningSince') is not None
    # Fill a fixed near-complete test fixture, then complete through real keyboard input.
    page.evaluate("""async (solution) => {
      const url = performance.getEntriesByType('resource').find(e => new URL(e.name).pathname === '/src/games/sudoku/store.ts').name;
      const store = (await import(url)).useSudokuStore;
      const entries = [...solution]; entries[0] = 0;
      store.setState({ puzzle: { id:'test', difficulty:'beginner', givens:entries, solution, techniques:[] }, entries,
        notes:Array(81).fill(0),selected:0,history:[],phase:'playing',dialog:'none',notesMode:false });
    }""", SOLUTION)
    page.locator('[data-cell="0"]').focus()
    page.keyboard.press('5')
    expect(page.get_by_role('heading',name='SOLVED',exact=True)).to_be_visible()
    assert state('s.runningSince') is None
    page.screenshot(path=str(ARTIFACTS/'completed.png'),full_page=True)
    page.get_by_role('button',name='Play Again',exact=True).click()
    assert state('s.phase') == 'playing'
    assert state('s.difficulty') == 'beginner'
    assert state('s.hintsUsed') == 0
    expect(page.get_by_role('dialog')).to_have_count(0)
    page.screenshot(path=str(ARTIFACTS/'sudoku.png'),full_page=True)
    for width in [390,320]:
        page.set_viewport_size({'width':width,'height':844})
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
        expect(page.get_by_role('button',name='Hint',exact=True)).to_be_visible()
        page.get_by_role('button',name='Hint',exact=True).scroll_into_view_if_needed()
        assert page.get_by_role('button',name='Hint',exact=True).bounding_box()['y'] < 844
        page.screenshot(path=str(ARTIFACTS/f'sudoku-{width}.png'),full_page=True)
    page.get_by_role('button',name='Games',exact=True).click()
    page.get_by_role('button',name='Leave puzzle',exact=True).click()
    expect(page.get_by_role('heading',name='GUESTWORLD',exact=True)).to_be_visible()
    assert state('s.phase') == 'idle'
    page.get_by_role('button',name='Sudoku',exact=True).scroll_into_view_if_needed()
    assert page.get_by_role('button',name='Sudoku',exact=True).bounding_box()['y'] < 844
    page.screenshot(path=str(ARTIFACTS/'hub-mobile.png'),full_page=True)
    page.get_by_role('button',name='Sudoku',exact=True).click()
    page.get_by_role('button',name='Expert',exact=False).click()
    page.get_by_role('button',name='Start puzzle').click()
    page.reload()
    expect(page.get_by_role('heading',name='GUESTWORLD',exact=True)).to_be_visible()
    assert not errors, errors
    print(json.dumps({'result':'passed','browser_errors':errors,'artifacts':str(ARTIFACTS)}))
    browser.close()
