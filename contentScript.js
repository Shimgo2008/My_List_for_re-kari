function checkTimeText() {
  const timeText = document.getElementsByClassName("text_#fff fs_12 font_alnum select_none")[0].innerText;
  const [now, maxtime] = timeText.split(' / ');
  return { now, maxtime };
}
