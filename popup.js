document.addEventListener('DOMContentLoaded', function() {
  document.getElementById('extractButton').addEventListener('click', function() {
    const folderName = document.getElementById("folderNameInput").value;
    const loop = document.getElementById('loopCheckbox').checked;

    if (!folderName) {
      console.error('Folder name is empty');
      return;
    }

    console.log('Extract button clicked');
    console.log('Folder name:', folderName);
    console.log('Loop:', loop);

    chrome.runtime.sendMessage({
      action: 'startProcessing',
      folderName: folderName,
      loop: loop
    });
  });

  let list = document.getElementById("folderNameList");

  chrome.bookmarks.getTree(function(bookmarkTreeNodes) {
    function getFolderNames(nodes) {
      let folderNames = [];
      for (let node of nodes) {
        if (!node.url) { // フォルダの場合、urlプロパティは存在しない
          folderNames.push(node.title);
          if (node.children) {
            folderNames = folderNames.concat(getFolderNames(node.children)); // 再帰的に子ノードを探索
          }
        }
      }
      return folderNames;
    }

    const allFolderNames = getFolderNames(bookmarkTreeNodes);
    console.log(allFolderNames); // ブックマークフォルダの名前の配列を表示

    for (let i = 0; i < allFolderNames.length; i++) {
      let option = document.createElement("option");
      option.value = allFolderNames[i];
      list.appendChild(option);
    }
  });
});
