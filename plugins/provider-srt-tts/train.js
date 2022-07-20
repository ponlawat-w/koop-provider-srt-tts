module.exports = {
  getId: (trainNumber, runDateStr) => {
    const runDateComponents = runDateStr.split('-').map(x => parseInt(x));
    const date = new Date(runDateComponents[2], runDateComponents[1] - 1, runDateComponents[0], 0, 0, trainNumber);
    return date.getTime() / 1000;
  },
  expandId: (trainId) => {
    if (!trainId) {
      return {
        trainNumber: undefined, runDate: undefined
      };
    }

    const trainIdDate = new Date(trainId * 1000);
    const trainNumber = (trainIdDate.getTime() - (new Date(trainIdDate.getFullYear(), trainIdDate.getMonth(), trainIdDate.getDate())).getTime()) / 1000;
  
    return {
      trainNumber: trainNumber,
      runDate: `${trainIdDate.getDate().toString().padStart(2, '0')}-` +
        `${(trainIdDate.getMonth() + 1).toString().padStart(2, '0')}-` +
        `${trainIdDate.getFullYear().toString().padStart(4, '0')}`
    };
  }
}
