// ========== Script.js Part 3A: 相場ノート機能 ==========

// === Part 3A固有のグローバル変数定義 ===
// 編集モード関連（Part 3A専用）
let isEditingNote = false;      // 編集モード状態
let editingNoteDate = null;     // 編集中のノート日付
let autoSaveTimer = null;       // 自動保存タイマー

// 注：以下の変数は他のPartで定義されているため、ここでは定義しない
// - selectedNoteForEdit: モーダル編集用（廃止予定）
// - currentWeekStart: 週間表示用
// - selectedNoteDate: 選択中の日付
// - currentCalendarDate: カレンダー表示
// - selectedDate: 選択された日付

// HTMLクリーンアップ用のヘルパー関数を追加
function cleanupNoteHTML(html) {
    if (!html) return '';
    
    // 空のspan要素やタグを削除する正規表現
    let cleaned = html
        .replace(/<span><\/span>/gi, '') // 空のspan
        .replace(/<span\s*style=""[^>]*><\/span>/gi, '') // スタイルが空のspan
        .replace(/(<br\s*\/?>){2,}/gi, '') // 連続するBR
        .replace(/^<br\s*\/?>|<br\s*\/?>$/gi, ''); // 先頭・末尾のBR
    
    return cleaned.trim();
}

// 画像追加処理（相場ノート用）
function addNoteImage() {
    pendingHeadingNumber = null; // nullに設定
    pendingImageType = null; // nullに設定
    selectedTradeForEdit = null; // nullに設定
    document.getElementById('imageAddModal').style.display = 'flex';
}

// 日付変更（相場ノート用）
function changeDate(days) {
    const currentDate = new Date(document.getElementById('noteDate').value || new Date());
    currentDate.setDate(currentDate.getDate() + days);
    document.getElementById('noteDate').value = formatDateForInput(currentDate);
    loadNoteForDate(formatDateForInput(currentDate));
}

// 今日の日付に設定
function setToday() {
    const today = new Date();
    document.getElementById('noteDate').value = formatDateForInput(today);
    loadNoteForDate(formatDateForInput(today));
}

// 指定日付のノートを読み込む（修正版）
function loadNoteForDate(dateStr) {
    const note = notes[dateStr];
    
    const memoElement = document.getElementById('noteMemo');
    const marketViewElement = document.getElementById('noteMarketView');
    const imagesContainer = document.getElementById('noteImages');
    
    if (memoElement) memoElement.innerHTML = '';
    if (marketViewElement) marketViewElement.innerHTML = '';
    if (imagesContainer) imagesContainer.innerHTML = '';
    
    if (note) {
        // HTMLをクリーンアップする関数
        function cleanupHTML(html) {
            if (!html) return '';
            
            // 一時的なdiv要素でHTMLを解析
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = html;
            
            // 空のspan要素を削除
            tempDiv.querySelectorAll('span').forEach(span => {
                if (!span.textContent.trim() && !span.style.cssText) {
                    span.remove();
                }
            });
            
            // 連続するBR要素を1つにまとめる
            let cleanedHTML = tempDiv.innerHTML;
            cleanedHTML = cleanedHTML.replace(/(<br\s*\/?>){2,}/gi, '<br>');
            
            // 末尾の不要な要素を削除
            cleanedHTML = cleanedHTML.replace(/(<br\s*\/?>|<span><\/span>)+$/gi, '');
            
            return cleanedHTML;
        }
        
        // 改行を確実に表示
        if (memoElement && note.memo) {
            let displayMemo = cleanupHTML(note.memo);
            // すでに<br>が含まれていればそのまま、なければ改行を<br>に変換
            if (!displayMemo.includes('<br') && displayMemo.includes('\n')) {
                displayMemo = displayMemo.replace(/\n/g, '<br>');
            }
            memoElement.innerHTML = displayMemo;
            
            // 高さを調整（5行分に制限）
            const lineHeight = 24; // CSSのline-heightと同じ
            const maxLines = 5;
            const maxHeight = lineHeight * maxLines;
            
            // 実際の高さを確認して調整
            setTimeout(() => {
                if (memoElement.offsetHeight > maxHeight) {
                    // 内容を5行に収める処理
                    const lines = displayMemo.split('<br>');
                    if (lines.length > maxLines) {
                        memoElement.innerHTML = lines.slice(0, maxLines).join('<br>');
                    }
                }
            }, 0);
        }
        
        if (marketViewElement && note.marketView) {
            let displayMarketView = cleanupHTML(note.marketView);
            if (!displayMarketView.includes('<br') && displayMarketView.includes('\n')) {
                displayMarketView = displayMarketView.replace(/\n/g, '<br>');
            }
            marketViewElement.innerHTML = displayMarketView;
        }
        
        if (imagesContainer && note.images && note.images.length > 0) {
            note.images.forEach(img => {
                displayNoteImage(img);
            });
        }
    }
}

// collectNoteImages関数
function collectNoteImages() {
    const images = [];
    const imagesContainer = document.getElementById('noteImages');
    if (imagesContainer) {
        const imageElements = imagesContainer.querySelectorAll('img');
        imageElements.forEach(img => {
            images.push(img.src);
        });
    }
    return images;
}

// displayNoteImage関数
function displayNoteImage(imageSrc) {
    const container = document.getElementById('noteImages');
    if (!container) return;
    
    // 画像の総数を取得
    const imageCount = container.querySelectorAll('.note-image-wrapper').length;
    
    const imgWrapper = document.createElement('div');
    imgWrapper.className = 'note-image-wrapper';
    imgWrapper.style.cssText = 'position: relative; display: inline-block; margin: 5px;';
    imgWrapper.setAttribute('data-index', imageCount);  // インデックスを設定
    
    const img = document.createElement('img');
    img.src = imageSrc;
    img.style.cssText = 'max-width: 200px; max-height: 150px; cursor: pointer; border-radius: 8px;';
    img.onclick = () => showImageModal(imageSrc);
    
    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = '×';
    deleteBtn.style.cssText = 'position: absolute; top: -5px; right: -5px; background: #ff4444; color: white; border: none; border-radius: 50%; width: 24px; height: 24px; cursor: pointer;';
    deleteBtn.onclick = () => {
        imgWrapper.remove();
        updateImageIndices();  // インデックスを更新
    };
    
    imgWrapper.appendChild(img);
    imgWrapper.appendChild(deleteBtn);
    container.appendChild(imgWrapper);
}

// 画像削除関数
function removeNoteImage(index) {
    const imagesContainer = document.getElementById('noteImages');
    if (!imagesContainer) return;
    
    const images = imagesContainer.querySelectorAll('.note-image-wrapper');
    if (images[index]) {
        images[index].remove();
        updateImageIndices();  // インデックスを更新
    }
}

// 画像インデックスを更新
function updateImageIndices() {
    const imagesContainer = document.getElementById('noteImages');
    if (!imagesContainer) return;
    
    const images = imagesContainer.querySelectorAll('.note-image-wrapper');
    images.forEach((wrapper, index) => {
        wrapper.setAttribute('data-index', index);
    });
}

// 新規作成/更新を統合した保存関数
function saveOrUpdateNote() {
    if (isEditingNote && editingNoteDate) {
        // 更新処理
        updateNoteFromMainEditor();
    } else {
        // 新規作成処理（既存のsaveNote関数を呼び出し）
        saveNote();
    }
}

// ノート保存（修正版）
function saveNote() {
    // 編集モードの場合は更新処理を行う
    if (isEditingNote && editingNoteDate) {
        updateNoteFromMainEditor();
        return;
    }
    
    const noteDate = document.getElementById('noteDate').value;
    const memoElement = document.getElementById('noteMemo');
    const marketViewElement = document.getElementById('noteMarketView');
    
    let memo = '';
    let marketView = '';
    
    if (memoElement) {
        // 改行を確実に<br>に変換して保存
        memo = memoElement.innerHTML
            .replace(/<div>/gi, '\n')
            .replace(/<\/div>/gi, '')
            .replace(/<p>/gi, '\n')
            .replace(/<\/p>/gi, '')
            .replace(/\n\n+/g, '\n')  // 連続改行を1つに
            .replace(/\n/g, '<br>')   // 改行を<br>に統一
            .replace(/^<br>/i, '')    // 先頭のbrを削除
            .trim();
        
        // クリーンアップ
        memo = cleanupNoteHTML(memo);
    }
    
    if (marketViewElement) {
        marketView = marketViewElement.innerHTML
            .replace(/<div>/gi, '\n')
            .replace(/<\/div>/gi, '')
            .replace(/<p>/gi, '\n')
            .replace(/<\/p>/gi, '')
            .replace(/\n\n+/g, '\n')
            .replace(/\n/g, '<br>')
            .replace(/^<br>/i, '')
            .trim();
        
        // クリーンアップ
        marketView = cleanupNoteHTML(marketView);
    }
    
    if (!noteDate) {
        showToast('日付を選択してください', 'error');
        return;
    }
    
    // テキストが空かチェック（HTMLタグを除去して確認）
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = memo + marketView;
    const plainText = tempDiv.textContent || tempDiv.innerText || '';
    
    if (!plainText.trim()) {
        showToast('内容を入力してください', 'error');
        return;
    }
    
    // ノートデータの構築
    const noteData = {
        date: noteDate,
        memo: memo,
        marketView: marketView,
        images: collectNoteImages(),
        createdAt: notes[noteDate]?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    
    notes[noteDate] = noteData;
    saveNotes();
    updateWeeklyPreview();
    
    const date = new Date(noteDate);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    showToast(`${month}/${day}の相場ノートを保存しました`, 'success');
}

// メインエディタからの更新処理
function updateNoteFromMainEditor() {
    if (!editingNoteDate) return;
    
    // 更新対象の日付を保存（cancelEditで消される前に）
    const targetDate = editingNoteDate;
    const note = notes[targetDate] || {};
    
    // データを収集
    const memoElement = document.getElementById('noteMemo');
    const marketViewElement = document.getElementById('noteMarketView');
    
    if (memoElement) {
        const memoHtml = memoElement.innerHTML
            .replace(/<div>/gi, '<br>')
            .replace(/<\/div>/gi, '')
            .replace(/<p>/gi, '<br>')
            .replace(/<\/p>/gi, '')
            .replace(/^<br>/i, '');
        note.memo = cleanupNoteHTML(memoHtml.trim());
    }
    
    if (marketViewElement) {
        const marketViewHtml = marketViewElement.innerHTML
            .replace(/<div>/gi, '<br>')
            .replace(/<\/div>/gi, '')
            .replace(/<p>/gi, '<br>')
            .replace(/<\/p>/gi, '')
            .replace(/^<br>/i, '');
        note.marketView = cleanupNoteHTML(marketViewHtml.trim());
    }
    
    // 画像を収集
    note.images = collectNoteImages();
    
    // タイムスタンプ
    note.updatedAt = new Date().toISOString();
    if (!note.createdAt) {
        note.createdAt = note.updatedAt;
    }
    
    // 保存
    notes[targetDate] = note;
    saveNotes();
    
    // 更新メッセージ用に日付を分解
    let month = '';
    let day = '';
    if (targetDate && targetDate.includes('-')) {
        const dateParts = targetDate.split('-');
        month = parseInt(dateParts[1]);
        day = parseInt(dateParts[2]);
    }
    
    // UIをリセット（editingNoteDateがnullになる）
    cancelEdit();
    
    // 週間プレビューを更新
    updateWeeklyPreview();
    
    // 更新したノートの詳細を表示（targetDateを使用）
    displayNoteDetail(targetDate);
    selectNoteDate(targetDate);
    
    // メッセージ表示
    if (month && day) {
        showToast(`${month}/${day}のノートを更新しました`, 'success');
    } else {
        showToast('ノートを更新しました', 'success');
    }
}

// 編集をキャンセル
function cancelEdit() {
    isEditingNote = false;
    editingNoteDate = null;
    
    // インジケーターを非表示
    const indicator = document.getElementById('editingIndicator');
    if (indicator) {
        indicator.style.display = 'none';
    }
    
    // ハイライトを削除
    const noteInputArea = document.querySelector('.note-input-area');
    if (noteInputArea) {
        noteInputArea.classList.remove('editing-mode');
    }
    
    // 日付入力を有効化
    const noteDateElement = document.getElementById('noteDate');
    if (noteDateElement) {
        noteDateElement.disabled = false;
        noteDateElement.value = formatDateForInput(new Date());
    }
    
    // フォームをクリア
    clearNoteForm();
    
    // ボタンテキストを戻す
    const saveBtn = document.getElementById('saveNoteBtn');
    if (saveBtn) {
        saveBtn.textContent = 'ノートを保存';
        saveBtn.classList.remove('btn-update');
    }
}

// ノートフォームをクリア（修正版：編集モードも解除）
function clearNoteForm() {
    const noteDateElement = document.getElementById('noteDate');
    const memoElement = document.getElementById('noteMemo');
    const marketViewElement = document.getElementById('noteMarketView');
    const imagesContainer = document.getElementById('noteImages');
    
    // 編集モードの場合は解除
    if (isEditingNote) {
        cancelEdit();
        return;
    }
    
    if (noteDateElement) {
        noteDateElement.value = formatDateForInput(new Date());
    }
    if (memoElement) memoElement.innerHTML = '';  // innerHTMLでクリア
    if (marketViewElement) marketViewElement.innerHTML = '';  // innerHTMLでクリア
    if (imagesContainer) imagesContainer.innerHTML = '';
}

// 一時保存
function saveNoteTemporary() {
    const noteDate = document.getElementById('noteDate').value;
    if (!noteDate) return;
    
    // 現在の入力内容を一時的に保存（実装は簡略化）
}

// 相場ノート用フォーマット適用
function applyNoteFormat(editorId, format) {
    let editorElementId;
    
    // エディタIDの判定
    switch(editorId) {
        case 'memo':
            editorElementId = 'noteMemo';
            break;
        case 'marketView':
            editorElementId = 'noteMarketView';
            break;
        case 'editMemo':
            editorElementId = 'editNoteMemo';
            break;
        case 'editMarketView':
            editorElementId = 'editNoteMarketView';
            break;
        default:
            return;
    }
    
    const editor = document.getElementById(editorElementId);
    if (!editor) return;
    
    // 選択範囲の保存
    document.execCommand('styleWithCSS', false, true);
    
    switch(format) {
        case 'bold':
            document.execCommand('bold', false, null);
            break;
        case 'underline':
            document.execCommand('underline', false, null);
            break;
        case 'red':
            document.execCommand('foreColor', false, 'red');
            break;
        case 'blue':
            document.execCommand('foreColor', false, 'blue');
            break;
        case 'highlight':
            document.execCommand('hiliteColor', false, 'yellow');
            break;
        case 'default':
            // デフォルト色に戻す
            document.execCommand('removeFormat', false, null);
            break;
    }
    
    // フォーカスを維持
    editor.focus();
}

// applyFormatting関数（applyNoteFormatと同じ機能）
function applyFormatting(editorId, format) {
    applyNoteFormat(editorId, format);
}

// 相場ノートの自動保存機能
// let autoSaveTimer = null; // グローバル変数セクションに移動済み

function setupNoteAutoSave() {
    const memoElement = document.getElementById('noteMemo');
    const marketViewElement = document.getElementById('noteMarketView');
    
    if (!memoElement || !marketViewElement) return;
    
    // 入力監視（inputイベントで監視）
    [memoElement, marketViewElement].forEach(element => {
        element.addEventListener('input', () => {
            clearTimeout(autoSaveTimer);
            autoSaveTimer = setTimeout(() => {
                autoSaveNoteQuietly();
            }, 2000); // 2秒後に自動保存
        });
        
        // フォーカスアウト時も保存
        element.addEventListener('blur', () => {
            clearTimeout(autoSaveTimer);
            autoSaveNoteQuietly();
        });
    });
}

function autoSaveNoteQuietly() {
    const noteDate = document.getElementById('noteDate').value;
    const memoElement = document.getElementById('noteMemo');
    const marketViewElement = document.getElementById('noteMarketView');
    
    if (!noteDate) return;
    
    // contentEditableからHTMLを取得（改行を<br>に変換）
    let memo = '';
    let marketView = '';
    
    if (memoElement) {
        // innerHTML取得前に改行を正規化
        const memoHtml = memoElement.innerHTML
            .replace(/<div>/gi, '<br>')
            .replace(/<\/div>/gi, '')
            .replace(/<p>/gi, '<br>')
            .replace(/<\/p>/gi, '')
            .replace(/^<br>/i, ''); // 先頭のbrを削除
        memo = cleanupNoteHTML(memoHtml.trim());
    }
    
    if (marketViewElement) {
        // 同様に処理
        const marketViewHtml = marketViewElement.innerHTML
            .replace(/<div>/gi, '<br>')
            .replace(/<\/div>/gi, '')
            .replace(/<p>/gi, '<br>')
            .replace(/<\/p>/gi, '')
            .replace(/^<br>/i, '');
        marketView = cleanupNoteHTML(marketViewHtml.trim());
    }
    
    // 空の場合は保存しない
    if (!memo && !marketView) return;
    
    const noteData = {
        date: noteDate,
        memo: memo,
        marketView: marketView,
        images: collectNoteImages(),
        createdAt: notes[noteDate]?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    
    notes[noteDate] = noteData;
    saveNotes();
    updateWeeklyPreview();
}

// 週間プレビューの初期化
function initializeWeekView() {
    // currentWeekStartが未定義の場合は初期化
    if (typeof currentWeekStart === 'undefined' || !currentWeekStart) {
        window.currentWeekStart = new Date();
    }
    
    const today = new Date();
    const monday = new Date(today);
    const day = monday.getDay();
    const diff = monday.getDate() - day + (day === 0 ? -6 : 1);
    monday.setDate(diff);
    
    currentWeekStart = monday;
    updateWeeklyPreview();
    
    // 詳細表示エリアを初期化（50:50レイアウトのため必須）
    const detailContainer = document.getElementById('noteDetail');
    if (detailContainer) {
        // 初期状態では日付が選択されていないので、プレースホルダーを表示
        if (!selectedNoteDate) {
            detailContainer.innerHTML = `
                <div class="detail-placeholder">
                    <p>📝 日付を選択してノートを表示</p>
                </div>
            `;
        }
    }
    
    // 50:50レイアウトを確実に設定（Part 3分割後の修正）
    const noteDisplayContainer = document.querySelector('.note-display-container');
    if (noteDisplayContainer) {
        // インラインスタイルをクリアして、CSSの1fr 1frを使用
        noteDisplayContainer.style.gridTemplateColumns = '';
        // 必要に応じて明示的に設定
        if (window.getComputedStyle(noteDisplayContainer).gridTemplateColumns.includes('px')) {
            noteDisplayContainer.style.gridTemplateColumns = '1fr 1fr';
        }
    }
}

// 週間プレビューの更新
function updateWeeklyPreview() {
    // currentWeekStartの初期化チェック
    if (typeof currentWeekStart === 'undefined' || !currentWeekStart || !(currentWeekStart instanceof Date)) {
        window.currentWeekStart = new Date();
        const day = currentWeekStart.getDay();
        const diff = currentWeekStart.getDate() - day + (day === 0 ? -6 : 1);
        currentWeekStart.setDate(diff);
    }
    
    const weekEnd = new Date(currentWeekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    
    const rangeText = `${formatDateForDisplay(currentWeekStart)} - ${formatDateForDisplay(weekEnd)}`;
    const weekRangeElement = document.getElementById('currentWeekRange');
    if (weekRangeElement) weekRangeElement.textContent = rangeText;
    
    const container = document.getElementById('weekDays');
    if (!container) return;
    
    container.innerHTML = '';
    
    const weekdays = ['月', '火', '水', '木', '金', '土', '日'];
    
    for (let i = 0; i < 7; i++) {
        const date = new Date(currentWeekStart);
        date.setDate(date.getDate() + i);
        const dateStr = formatDateForInput(date);
        const note = notes[dateStr];
        
        const dayPreview = createDayPreview(date, dateStr, note, weekdays[i]);
        container.appendChild(dayPreview);
    }
}

// createDayPreview関数（元のPart 3.txtと同じ）
function createDayPreview(date, dateStr, note, weekday) {
    const dayDiv = document.createElement('div');
    dayDiv.className = 'day-preview';
    
    // selectedNoteDateが定義されているかチェック
    if (typeof selectedNoteDate !== 'undefined' && selectedNoteDate === dateStr) {
        dayDiv.classList.add('selected');
    }
    
    // ヘッダー部分を作成
    const headerDiv = document.createElement('div');
    headerDiv.className = 'day-preview-header';
    headerDiv.innerHTML = `
        <span class="day-preview-date">${date.getMonth() + 1}/${date.getDate()}</span>
        <span class="day-preview-weekday">${weekday}曜日</span>
    `;
    
    // コンテンツ部分を作成
    const contentDiv = document.createElement('div');
    contentDiv.className = 'day-preview-content';
    
    // 5行を作成
    for (let i = 0; i < 5; i++) {
        const lineDiv = document.createElement('div');
        lineDiv.className = 'day-preview-line';
        
        if (note && note.memo) {
            // 一時的なdivに入れてbrタグを処理
            const tempDiv = document.createElement('div');
            // クリーンアップされたHTMLを使用
            tempDiv.innerHTML = cleanupNoteHTML(note.memo);
            
            // brタグを改行文字に変換してからテキストを取得
            let textContent = tempDiv.innerHTML
                .replace(/<br\s*\/?>/gi, '\n')
                .replace(/<\/div><div>/gi, '\n')
                .replace(/<\/div>/gi, '\n')
                .replace(/<div>/gi, '')
                .replace(/<\/p><p>/gi, '\n')
                .replace(/<\/p>/gi, '\n')
                .replace(/<p>/gi, '');
            
            // 不要なstyle属性を除去
            const cleanDiv = document.createElement('div');
            cleanDiv.innerHTML = textContent;
            
            // style属性を保持したい要素のみ処理
            cleanDiv.querySelectorAll('*').forEach(el => {
                if (el.style.color === 'red' || el.style.color === 'rgb(255, 0, 0)') {
                    el.setAttribute('style', 'color: red;');
                } else if (el.style.color === 'blue' || el.style.color === 'rgb(0, 0, 255)') {
                    el.setAttribute('style', 'color: blue;');
                } else if (el.style.backgroundColor && el.style.backgroundColor.includes('yellow')) {
                    el.setAttribute('style', 'background: yellow;');
                } else {
                    el.removeAttribute('style');
                }
            });
                            
            // 改行で分割
            const lines = cleanDiv.innerHTML.split('\n').filter(line => line.trim());
            
            if (i < lines.length) {
                lineDiv.innerHTML = lines[i];
            } else {
                lineDiv.innerHTML = '&nbsp;';
            }
        } else {
            lineDiv.innerHTML = '&nbsp;';
        }
        
        contentDiv.appendChild(lineDiv);
    }
    
    // 要素を組み立て
    dayDiv.appendChild(headerDiv);
    dayDiv.appendChild(contentDiv);
    
    dayDiv.onclick = () => selectNoteDate(dateStr);
    return dayDiv;
}

// ノート日付選択
function selectNoteDate(dateStr) {
    // グローバル変数として設定
    if (typeof window.selectedNoteDate === 'undefined') {
        window.selectedNoteDate = dateStr;
    } else {
        selectedNoteDate = dateStr;
    }
    
    document.getElementById('noteDate').value = dateStr;
    
    // プレビューの選択状態を更新
    document.querySelectorAll('.day-preview').forEach(preview => {
        preview.classList.remove('selected');
    });
    
    // 詳細を表示
    displayNoteDetail(dateStr);
    loadNoteForDate(dateStr);
    
    // 週間プレビューを更新（選択状態の反映）
    updateWeeklyPreview();
}

// ノート詳細表示
function displayNoteDetail(dateStr) {
    const detailContainer = document.getElementById('noteDetail');
    const note = notes[dateStr];
    
    if (!note) {
        detailContainer.innerHTML = `
            <div class="detail-placeholder">
                <p>📝 ${dateStr} のノートはまだありません</p>
            </div>
        `;
        return;
    }
    
    let detailHTML = `
        <div class="note-detail-header">
            <h3>${dateStr}</h3>
            <div class="note-detail-actions">
                <button class="btn btn-small edit-btn" onclick="editNote('${dateStr}')">編集</button>
                <button class="btn btn-small delete-btn" onclick="deleteNote('${dateStr}')">削除</button>
            </div>
        </div>
        <div class="note-detail-content">
    `;
    
    // メモセクション
    if (note.memo) {
        detailHTML += `
            <div class="detail-section">
                <h4>メモ</h4>
                <div class="detail-text">${note.memo}</div>
            </div>
        `;
    }
    
    // 相場観セクション
    if (note.marketView) {
        detailHTML += `
            <div class="detail-section">
                <h4>今日の相場観</h4>
                <div class="detail-text">${note.marketView}</div>
            </div>
        `;
    }
    
    // 画像セクション
    if (note.images && note.images.length > 0) {
        detailHTML += `
            <div class="detail-section">
                <h4>画像</h4>
                <div class="detail-images">
        `;
        
        note.images.forEach((img, index) => {
            const imgSrc = typeof img === 'string' ? img : (img.data || img.url || img);
            detailHTML += `<img src="${imgSrc}" onclick="showImageModal('${imgSrc}')" style="cursor: pointer; max-width: 200px; max-height: 150px; margin: 5px; border-radius: 8px;">`;
        });
        
        detailHTML += `
                </div>
            </div>
        `;
    }
    
    detailHTML += '</div>';
    detailContainer.innerHTML = detailHTML;
}

// 週の変更
function changeWeek(direction) {
    // currentWeekStartが未定義の場合は初期化
    if (typeof currentWeekStart === 'undefined' || !currentWeekStart) {
        window.currentWeekStart = new Date();
        const day = currentWeekStart.getDay();
        const diff = currentWeekStart.getDate() - day + (day === 0 ? -6 : 1);
        currentWeekStart.setDate(diff);
    }
    currentWeekStart.setDate(currentWeekStart.getDate() + (direction * 7));
    updateWeeklyPreview();
}

// 週間カレンダー表示
function showWeekCalendar() {
    // currentCalendarDateが未定義の場合は初期化
    if (typeof currentCalendarDate === 'undefined') {
        window.currentCalendarDate = new Date();
    }
    
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = 'weekCalendarModal';
    modal.style.display = 'flex';
    
    const content = document.createElement('div');
    content.className = 'modal-content';
    content.style.maxWidth = '600px';
    
    content.innerHTML = `
        <div class="modal-header">
            <h2>📅 週を選択</h2>
            <button class="modal-close" onclick="closeWeekCalendarModal()">×</button>
        </div>
        <div style="padding: 20px;">
            <div class="calendar-navigation" style="margin-bottom: 20px; text-align: center;">
                <button class="btn btn-small btn-secondary" onclick="changeCalendarMonth(-1)">◀ 前月</button>
                <span id="calendarMonthYear" style="font-size: 1.2rem; font-weight: bold; margin: 0 20px;"></span>
                <button class="btn btn-small btn-secondary" onclick="changeCalendarMonth(1)">翌月 ▶</button>
            </div>
            <div id="weekCalendarGrid"></div>
        </div>
    `;
    
    modal.appendChild(content);
    document.body.appendChild(modal);
    
    updateWeekCalendar();
}

function updateWeekCalendar() {
    // currentCalendarDateが未定義の場合は初期化
    if (typeof currentCalendarDate === 'undefined') {
        window.currentCalendarDate = new Date();
    }
    
    const monthYearElement = document.getElementById('calendarMonthYear');
    const gridElement = document.getElementById('weekCalendarGrid');
    
    if (!monthYearElement || !gridElement) return;
    
    const year = currentCalendarDate.getFullYear();
    const month = currentCalendarDate.getMonth();
    
    monthYearElement.textContent = `${year}年${month + 1}月`;
    
    // カレンダーグリッド生成
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const firstDayOfWeek = firstDay.getDay();
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - (firstDayOfWeek === 0 ? 6 : firstDayOfWeek));
    
    // 曜日ヘッダー
    let html = '<div style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 5px; margin-bottom: 10px;">';
    const weekDays = ['日', '月', '火', '水', '木', '金', '土'];
    weekDays.forEach(day => {
        html += `<div style="text-align: center; font-weight: bold; padding: 5px;">${day}</div>`;
    });
    html += '</div>';
    
    // カレンダー日付
    html += '<div style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 5px;">';
    
    const currentDate = new Date(startDate);
    for (let week = 0; week < 6; week++) {
        for (let day = 0; day < 7; day++) {
            const dateStr = formatDateForInput(currentDate);
            const isCurrentMonth = currentDate.getMonth() === month;
            const isToday = currentDate.toDateString() === new Date().toDateString();
            const hasNote = notes[dateStr];
            
            html += `
                <div 
                    onclick="selectWeekFromDate('${dateStr}')" 
                    style="padding: 10px; text-align: center; cursor: pointer; 
                           border-radius: 5px; 
                           opacity: ${isCurrentMonth ? '1' : '0.5'};
                           background: ${isToday ? 'rgba(0, 255, 136, 0.2)' : 'rgba(255, 255, 255, 0.05)'}">
                    ${currentDate.getDate()}
                </div>
            `;
            
            currentDate.setDate(currentDate.getDate() + 1);
        }
    }
    
    html += '</div>';
    gridElement.innerHTML = html;
}

function selectWeekFromDate(dateStr) {
    const selectedDate = new Date(dateStr);
    const day = selectedDate.getDay();
    const diff = selectedDate.getDate() - day + (day === 0 ? -6 : 1);
    
    // グローバル変数として設定
    if (typeof window.currentWeekStart === 'undefined') {
        window.currentWeekStart = new Date(selectedDate);
    } else {
        currentWeekStart = new Date(selectedDate);
    }
    currentWeekStart.setDate(diff);
    
    updateWeeklyPreview();
    closeWeekCalendarModal();
    
    // 選択した日付をノート日付に設定
    document.getElementById('noteDate').value = dateStr;
    loadNoteForDate(dateStr);
}

function changeCalendarMonth(direction) {
    // currentCalendarDateが未定義の場合は初期化
    if (typeof currentCalendarDate === 'undefined') {
        window.currentCalendarDate = new Date();
    }
    currentCalendarDate.setMonth(currentCalendarDate.getMonth() + direction);
    updateWeekCalendar();
}

function closeWeekCalendarModal() {
    const modal = document.getElementById('weekCalendarModal');
    if (modal) modal.remove();
}

// カレンダー更新（分析タブ用）
function updateCalendar() {
    // currentCalendarDateが未定義の場合は初期化
    if (typeof currentCalendarDate === 'undefined') {
        window.currentCalendarDate = new Date();
    }
    
    // 安全な要素取得
    const monthElement = safeGetElement('currentMonth');
    const calendarElement = safeGetElement('calendarDates');
    
    if (!monthElement || !calendarElement) {
        return;
    }
    
    const year = currentCalendarDate.getFullYear();
    const month = currentCalendarDate.getMonth();
    
    // 月表示
    monthElement.textContent = `${year}年${month + 1}月`;
    
    // カレンダー生成
    calendarElement.innerHTML = '';
    
    // 月の最初の日と最後の日を取得
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const firstDayOfWeek = firstDay.getDay();
    
    // 前月の日付を追加
    const prevMonthDays = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;
    for (let i = prevMonthDays; i > 0; i--) {
        const date = new Date(year, month, 1 - i);
        const dateStr = formatDateForCalendar(date);
        const dayDiv = createCalendarDay(date, dateStr, false);
        calendarElement.appendChild(dayDiv);
    }
    
    // 当月の日付を追加
    for (let day = 1; day <= lastDay.getDate(); day++) {
        const date = new Date(year, month, day);
        const dateStr = formatDateForCalendar(date);
        const dayDiv = createCalendarDay(date, dateStr, true);
        calendarElement.appendChild(dayDiv);
    }
    
    // 次月の日付を追加
    const remainingDays = 42 - calendarElement.children.length;
    for (let day = 1; day <= remainingDays; day++) {
        const date = new Date(year, month + 1, day);
        const dateStr = formatDateForCalendar(date);
        const dayDiv = createCalendarDay(date, dateStr, false);
        calendarElement.appendChild(dayDiv);
    }
}

// カレンダーの日付要素を作成
function createCalendarDay(date, dateStr, isCurrentMonth) {
    const dayDiv = document.createElement('div');
    dayDiv.className = 'calendar-date';
    
    if (!isCurrentMonth) {
        dayDiv.classList.add('other-month');
    }
    
    // 今日の日付
    const today = new Date();
    if (date.toDateString() === today.toDateString()) {
        dayDiv.classList.add('today');
    }
    
    // 選択中の日付
    if (typeof selectedDate !== 'undefined' && selectedDate === dateStr) {
        dayDiv.classList.add('selected');
    }
    
    // トレードがある日
    const dayTrades = trades.filter(t => {
        const tradeDate = formatDateForCalendar(new Date(t.entryTime));
        return tradeDate === dateStr;
    });
    
    if (dayTrades.length > 0) {
        dayDiv.classList.add('has-trades');
        const indicator = document.createElement('div');
        indicator.className = 'trade-indicator';
        indicator.textContent = dayTrades.length;
        dayDiv.appendChild(indicator);
    }
    
    // ノートがある日
    if (notes[dateStr]) {
        dayDiv.classList.add('has-note');
    }
    
    // 日付表示
    const dayNumber = document.createElement('div');
    dayNumber.className = 'day-number';
    dayNumber.textContent = date.getDate();
    dayDiv.appendChild(dayNumber);
    
    // クリックイベント
    dayDiv.onclick = () => selectDate(dateStr);
    
    return dayDiv;
}

// 日付選択
function selectDate(dateStr) {
    // グローバル変数として設定
    if (typeof window.selectedDate === 'undefined') {
        window.selectedDate = dateStr;
    } else {
        selectedDate = dateStr;
    }
    
    updateCalendar();
    displayDateDetails(dateStr);
}

// 日付詳細表示
function displayDateDetails(dateStr) {
    const detailContainer = document.getElementById('dateDetails');
    if (!detailContainer) return;
    
    const date = new Date(dateStr);
    const dayTrades = trades.filter(t => {
        const tradeDate = formatDateForCalendar(new Date(t.entryTime));
        return tradeDate === dateStr;
    });
    const note = notes[dateStr];
    
    let detailHTML = `
        <div class="date-detail-header">
            <h3>${date.getMonth() + 1}月${date.getDate()}日 ${['日', '月', '火', '水', '木', '金', '土'][date.getDay()]}曜日</h3>
        </div>
    `;
    
    // トレード情報
    if (dayTrades.length > 0) {
        detailHTML += `
            <div class="date-detail-section">
                <h4>トレード記録（${dayTrades.length}件）</h4>
                <div class="trade-summary-list">
        `;
        
        dayTrades.forEach(trade => {
            const pips = calculateTradePips(trade);
            const status = trade.exits.length > 0 ? '決済済み' : '保有中';
            const pipsClass = pips > 0 ? 'positive' : pips < 0 ? 'negative' : '';
            
            detailHTML += `
                <div class="trade-summary-item">
                    <div>
                        <strong>${trade.pair}</strong>
                        <span class="trade-direction ${trade.direction}">${trade.direction.toUpperCase()}</span>
                    </div>
                    <div>
                        <span class="${pipsClass}">${pips > 0 ? '+' : ''}${pips.toFixed(1)} pips</span>
                        <span class="trade-status">${status}</span>
                    </div>
                </div>
            `;
        });
        
        detailHTML += `
                </div>
                <button class="btn btn-small" onclick="switchTab('records')">
                    トレード記録を見る
                </button>
            </div>
        `;
    }
    
    // ノート情報
    if (note) {
        detailHTML += `
            <div class="date-detail-section">
                <h4>相場ノート</h4>
                <div class="note-summary">
        `;
        
        const memoLines = note.memo ? note.memo.split('<br>').filter(line => line.trim()) : [];
        const marketViewLines = note.marketView ? note.marketView.split('<br>').filter(line => line.trim()) : [];
        const allLines = [...memoLines, ...marketViewLines];
        
        detailHTML += allLines.slice(0, 3).map(line => 
            `<p>${line.length > 50 ? line.substring(0, 50) + '...' : line}</p>`
        ).join('');
        
        detailHTML += `
                    <button class="btn btn-small" onclick="switchTab('notes'); selectNoteDate('${dateStr}')">
                        ノートを見る
                    </button>
                </div>
            </div>
        `;
    }
    
    if (dayTrades.length === 0 && !note) {
        detailHTML += `
            <div class="detail-placeholder">
                <p>この日の記録はありません</p>
                <button class="btn btn-small" onclick="switchTab('new-entry')">
                    トレードを記録
                </button>
                <button class="btn btn-small" onclick="switchTab('notes'); document.getElementById('noteDate').value='${dateStr}';">
                    ノートを書く
                </button>
            </div>
        `;
    }
    
    detailHTML += '</div>';
    detailContainer.innerHTML = detailHTML;
}

// 月の変更（カレンダー用）
function changeMonth(direction) {
    // currentCalendarDateが未定義の場合は初期化
    if (typeof currentCalendarDate === 'undefined') {
        window.currentCalendarDate = new Date();
    }
    currentCalendarDate.setMonth(currentCalendarDate.getMonth() + direction);
    updateCalendar();
}

// ノート編集（修正版：上部エディタで直接編集）
function editNote(dateStr) {
    const note = notes[dateStr];
    if (!note) return;
    
    // 編集モードを有効化
    isEditingNote = true;
    editingNoteDate = dateStr;
    
    // 画面上部の編集エリアへスムーズスクロール
    const notesTab = document.getElementById('notes');
    const noteInputArea = document.querySelector('.note-input-area');
    
    // スクロール位置を計算（タブの位置 + オフセット）
    const targetPosition = notesTab.offsetTop + 100;
    window.scrollTo({
        top: targetPosition,
        behavior: 'smooth'
    });
    
    // 編集インジケーターを表示
    const indicator = document.getElementById('editingIndicator');
    const editingDateSpan = document.getElementById('editingDate');
    if (indicator) {
        indicator.style.display = 'flex';
        if (editingDateSpan) {
            editingDateSpan.textContent = `${dateStr} のノートを編集中`;
        }
    }
    
    // 編集エリアにハイライトを追加
    if (noteInputArea) {
        noteInputArea.classList.add('editing-mode');
    }
    
    // 日付を設定（変更不可にする）
    const noteDateElement = document.getElementById('noteDate');
    if (noteDateElement) {
        noteDateElement.value = dateStr;
        noteDateElement.disabled = true;
    }
    
    // 既存のデータを編集エリアに読み込み
    const memoElement = document.getElementById('noteMemo');
    const marketViewElement = document.getElementById('noteMarketView');
    
    if (memoElement) {
        memoElement.innerHTML = note.memo || '';
    }
    
    if (marketViewElement) {
        marketViewElement.innerHTML = note.marketView || '';
    }
    
    // 画像がある場合は読み込み
    if (note.images && note.images.length > 0) {
        const imagesContainer = document.getElementById('noteImages');
        if (imagesContainer) {
            imagesContainer.innerHTML = '';
            note.images.forEach((img, index) => {
                const imgSrc = typeof img === 'string' ? img : (img.data || img.url || img);
                displayNoteImage(imgSrc);
            });
        }
    }
    
    // ボタンテキストを変更
    const saveBtn = document.getElementById('saveNoteBtn');
    if (saveBtn) {
        saveBtn.textContent = 'ノートを更新';
        saveBtn.classList.add('btn-update');
    }
    
    // フォーカスを設定（少し遅延させて確実に動作させる）
    setTimeout(() => {
        if (memoElement) {
            memoElement.focus();
        }
    }, 600);
    
    showToast('編集モードに入りました。上部のエディタで編集してください。', 'info');
}

// ノート削除
function deleteNote(dateStr) {
    if (!confirm('このノートを削除してもよろしいですか？')) return;
    
    const dateParts = dateStr.split('-');
    const month = parseInt(dateParts[1]);
    const day = parseInt(dateParts[2]);
    
    delete notes[dateStr];
    saveNotes();
    updateWeeklyPreview();
    
    // 詳細表示をクリア
    document.getElementById('noteDetail').innerHTML = `
        <div class="detail-placeholder">
            <p>📝 日付を選択してノートを表示</p>
        </div>
    `;
    
    showToast(`${month}/${day}のノートを削除しました`, 'success');
}

// ========== window登録 ==========
window.cleanupNoteHTML = cleanupNoteHTML;
window.addNoteImage = addNoteImage;
window.changeDate = changeDate;
window.setToday = setToday;
window.loadNoteForDate = loadNoteForDate;
window.collectNoteImages = collectNoteImages;
window.displayNoteImage = displayNoteImage;
window.removeNoteImage = removeNoteImage;
window.updateImageIndices = updateImageIndices;
window.saveOrUpdateNote = saveOrUpdateNote;
window.saveNote = saveNote;
window.updateNoteFromMainEditor = updateNoteFromMainEditor;
window.cancelEdit = cancelEdit;
window.clearNoteForm = clearNoteForm;
window.saveNoteTemporary = saveNoteTemporary;
window.applyNoteFormat = applyNoteFormat;
window.applyFormatting = applyFormatting;
window.setupNoteAutoSave = setupNoteAutoSave;
window.autoSaveNoteQuietly = autoSaveNoteQuietly;
window.initializeWeekView = initializeWeekView;
window.updateWeeklyPreview = updateWeeklyPreview;
window.createDayPreview = createDayPreview;
window.selectNoteDate = selectNoteDate;
window.displayNoteDetail = displayNoteDetail;
window.changeWeek = changeWeek;
window.showWeekCalendar = showWeekCalendar;
window.updateWeekCalendar = updateWeekCalendar;
window.selectWeekFromDate = selectWeekFromDate;
window.changeCalendarMonth = changeCalendarMonth;
window.closeWeekCalendarModal = closeWeekCalendarModal;
window.updateCalendar = updateCalendar;
window.createCalendarDay = createCalendarDay;
window.selectDate = selectDate;
window.displayDateDetails = displayDateDetails;
window.changeMonth = changeMonth;
window.editNote = editNote;
window.deleteNote = deleteNote;

// ========== 初期化処理 ==========
// DOMContentLoadedで自動実行
document.addEventListener('DOMContentLoaded', function() {
    // 相場ノートタブの初期化
    setTimeout(() => {
        // 週間プレビューの初期化
        if (typeof initializeWeekView === 'function') {
            initializeWeekView();
        }
        
        // ノート日付の初期設定
        const noteDateElement = document.getElementById('noteDate');
        if (noteDateElement) {
            const today = formatDateForInput(new Date());
            noteDateElement.value = today;
            
            if (typeof loadNoteForDate === 'function') {
                loadNoteForDate(today);
            }
        }
        
        // 自動保存の設定
        if (typeof setupNoteAutoSave === 'function') {
            setupNoteAutoSave();
        }
        
        // 詳細表示エリアの確実な初期化（50:50レイアウト用）
        const detailContainer = document.getElementById('noteDetail');
        if (detailContainer && !detailContainer.querySelector('.detail-placeholder') && !detailContainer.querySelector('.note-detail-content')) {
            detailContainer.innerHTML = `
                <div class="detail-placeholder">
                    <p>📝 日付を選択してノートを表示</p>
                </div>
            `;
        }
        
        // 50:50レイアウトの確実な設定（Part 3分割後の修正）
        const noteDisplayContainer = document.querySelector('.note-display-container');
        if (noteDisplayContainer) {
            // インラインスタイルをクリア
            noteDisplayContainer.style.gridTemplateColumns = '';
            // 少し待ってから確認（他のスクリプトの影響を避ける）
            setTimeout(() => {
                if (window.getComputedStyle(noteDisplayContainer).gridTemplateColumns.includes('px')) {
                    noteDisplayContainer.style.gridTemplateColumns = '1fr 1fr';
                }
            }, 200);
        }
    }, 100);
});

// ========== Part 3A 終了 ==========
