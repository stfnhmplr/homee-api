module.exports = {
  updateList: (list, obj) => {
    const objIndex = list.findIndex((o) => o.id === obj.id);

    if (objIndex > -1) {
      list[objIndex] = obj;
    } else {
      list.push(obj);
    }
  },
};
