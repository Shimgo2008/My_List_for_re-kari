chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'startProcessing') {
    const folderName = message.folderName;
    const loop = message.loop;

    console.log('Start processing');
    console.log('Folder name:', folderName);
    console.log('Loop:', loop);

    chrome.bookmarks.search({ title: folderName }, function(results) {
      if (results.length === 0) {
        console.log('Folder not found');
        return;
      }

      const folderId = results[0].id;
      console.log('Folder ID:', folderId);

      chrome.bookmarks.getSubTree(folderId, function(bookmarkTreeNodes) {
        const urls = [];

        function extractUrls(nodes) {
          for (let node of nodes) {
            if (node.url) {
              urls.push(node.url);
              console.log('Found URL:', node.url);
            } else if (node.children) {
              extractUrls(node.children);
            }
          }
        }

        extractUrls(bookmarkTreeNodes);

        let i = 0;
        const checkInterval = 1000; 
        let lastCheckTime = performance.now(); // 前回のチェック時刻

        const navigateToNextURL = () => {
          if (i >= urls.length) {
            if (!loop) {
              console.log('Reached end of URLs and loop is not enabled');
              return;
            }
            i = 0;
          }

          console.log('Navigating to URL:', urls[i]);
          chrome.tabs.update({ url: urls[i] }, function(tab) {
            // DevToolsウィンドウでないことを確認する
            if (!tab || tab.type === 'devtools') {
              console.error('Cannot operate on DevTools windows');
              return;
            }

            const checkTab = () => {
              const currentTime = performance.now(); // 現在の時刻を取得
              const deltaTime = currentTime - lastCheckTime; // 経過時間を計算

              if (deltaTime >= checkInterval) {
                console.log('Checking tab:', tab.id);
                lastCheckTime = currentTime; // チェック時刻を更新

                chrome.tabs.get(tab.id, (currentTab) => {
                  if (chrome.runtime.lastError || !currentTab) {
                    console.error('Tab does not exist:', chrome.runtime.lastError.message);
                    navigateToNextURL(); // 次のURLに移動
                    return;
                  }

                  chrome.scripting.executeScript({
                    target: { tabId: tab.id },
                    function: checkTimeText
                  }, (results) => {
                    if (chrome.runtime.lastError) {
                      console.error('Error checking timeText:', chrome.runtime.lastError.message);
                      setTimeout(checkTab, 1000); // エラーの場合も再チェック
                      return;
                    }

                    if (results && results[0].result) {
                      const { now, maxtime } = results[0].result;
                      console.log('Now:', now, 'MaxTime:', maxtime);

                      if (now === maxtime) {
                        console.log('Now matches MaxTime. Moving to next URL.');
                        i++;
                        navigateToNextURL(); // 次のURLに移動
                      } else {
                        console.log('Now does not match MaxTime. Rechecking');
                        setTimeout(checkTab, 1000); // 再チェック
                      }
                    } else {
                      console.error('No result from executeScript');
                      setTimeout(checkTab, 1000); // エラーの場合も再チェック
                    }
                  });
                });
              } else {
                setTimeout(checkTab, 1000); // 再チェック
              }
            };

            // ページが完全にロードされた後にチェックを開始する
            chrome.tabs.onUpdated.addListener(function listener(tabId, changeInfo) {
              if (tabId === tab.id && changeInfo.status === 'complete') {
                chrome.tabs.onUpdated.removeListener(listener);
                lastCheckTime = performance.now(); // チェック時刻を更新
                checkTab(); // 初回チェック
              }
            });
          });
        };

        navigateToNextURL(); // 最初のURLに移動
      });
    });
  }
});

function checkTimeText() {
  const timeText = document.getElementsByClassName("text_#fff fs_12 font_alnum select_none")[0].innerText;
  const [now, maxtime] = timeText.split(' / ');
  console.log('TimeText:', timeText);
  return { now, maxtime };
}
