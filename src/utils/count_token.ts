// currently not used

function debounce(fn, delay) {
  let timeout;
  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn.apply(this, args), delay);
  };
}

// async function count_token(s) {
//   if (s === undefined) {
//     s = inputRef.value;
//   }
//   const response = await fetch("/api/count_token", {
//     method: "POST",
//     body: JSON.stringify({
//       text: inputRef.value,
//     }),
//   });
//   const num_token = await response.json();
//   console.log(num_token);
//   setNumToken(num_token.size);
// }

export {};
