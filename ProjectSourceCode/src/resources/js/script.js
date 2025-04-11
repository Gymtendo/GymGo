// *********************************************************************************
// SCRIPT FOR PROGRESS BAR
// *********************************************************************************

// Displays the progress bar graphic accurately for the current progress
document.querySelectorAll('.progress').forEach(progress => {
    // Calculates the percentage of progress made
    const cur = parseInt(progress.dataset.current);
    const max = parseInt(progress.dataset.max);
    const percent = (cur / max) * 100;

    // Displays the correct current progress / max progress text
    const wrapper = progress.parentElement;
    const text = progress.querySelector('.progress-text');
    text.textContent = `${cur} / ${max}`;

    // Displays the accurate progress graphic
    const bar = progress.querySelector('.progress-bar');
    bar.style.width = percent + '%';
    progress.setAttribute('aria-valuenow', cur);
});

// (BELOW CODE IS FOR IF WE WANT THE BAR TO UPDATE AUTOMATICALLY. CURRENTLY IN STASIS MAY NOT BE NECESSARY)
// // Function to update the progress and display text on the bar
// async function updateProgressBars() {
//     const progressBars = document.querySelectorAll('.progress');

//     for (const progress of progressBars) {
//         const bar = progress.querySelector('.progress-bar');

//         try {
//             const res = await fetch('/boss');
//             if (!res.ok) continue;

//             const data = await res.json();
//             const percent = (data.hp / data.maxHp) * 100;

//             bar.style.width = percent + '%';
//             bar.textContent = `${data.hp} / ${data.maxHp}`;
//             progress.setAttribute('aria-valuenow', data.hp);
//             progress.setAttribute('aria-valuemax', data.maxHp);
//         } catch (err) {
//             console.error('Error updating boss HP bar', err);
//         }
//     }
// }

// // Loading initial progress bar display
// updateProgressBars();

// //Automatic progress bar update if time allows
// setInterval(() => {
//     let cur = parseInt(progress.dataset.current);
//     const max = parseInt(progress.dataset.max);

//     // Example: auto-heal logic
//     if (cur < max) {
//         cur++;
//         progress.dataset.current = cur;
//         updateProgressBar(progress);
//     }
// // }, 500); // For testing, will update every 5 seconds
// }, 60000); // Currently updates progress bar every minute, can change