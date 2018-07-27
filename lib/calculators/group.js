// const { ElementGroup } = require("../components/data");
module.exports = operators => {
  class GroupCalculator extends operators.Calculator {
    constructor(env, groupAssigner) {
      super(env);
      this.groupAssigner = groupAssigner;
    }
  
    getGroupId(elem) {
      if (Array.isArray(this.groupAssigner)) {
        return this.groupAssigner.map(gnk => elem.get(gnk)).join(":");
      } else {
        return this.groupAssigner(elem)[1];
      }
    }
  
    structuredGroupdId(elem) {
      if (Array.isArray(this.groupAssigner)) {
        return this.groupAssigner.map(gnk => [gnk, elem.get(gnk)]);
      } else {
        return this.groupAssigner(elem);
      }
    }
  
    // 扁平结构组
    async calc(elemSet) {
      let bucket = new Map();
  
      for (let elem of elemSet) {
        let elemGrp = bucket.get(this.getGroupId(elem));
        if (!elemGrp) {
          elemGrp = new ElementGroup(this.structuredGroupdId(elem));
          bucket.set(groupName, elemGrp);
        }
  
        elemGrp.add(elem);
      }
  
      for (let elemGrp of bucket) {
        this.product(elemGrp);
      }
    }
  
    // 树形结构组
    // groupBy(elemSet, groupNameKeys) {
    //   const [groupNameKey, ...subGroupNameKeys] = groupNameKeys;
    //   const group = { groupNameKey, [groupNameKey]: new Map() };
    //   const groupEntry = group[groupNameKey];
  
    //   for (let elem of elemSet) {
    //     const groupName = elem.get(groupNameKey);
    //     let elemGrp = groupEntry.get(groupName);
    //     if (!elemGrp) {
    //       elemGrp = new ElementGroup(groupNameKey, groupName);
    //       groupEntry.set(groupName, elemGrp);
    //     }
    //     elemGrp.add(elem);
    //   }
  
    //   for (let entry of groupEntry) {
    //     if (subGroupNameKeys.length !== 0) {
    //       groupEntry.set(entry.groupName, this.groupBy(entry, subGroupNameKeys));
    //     }
    //   }
  
    //   return group;
    // }
  }
  
  operators.register("GroupCalculator", GroupCalculator);
};