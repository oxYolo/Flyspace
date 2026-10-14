// 通过键值对递归查找节点
export const getNodeByKeyValue = (tree, key, value) => {
  // 1. 先在当前层级查找匹配的节点
  const found = tree.find((node) => node[key] === value);
  // 2. 如果找到就直接返回，否则递归查找子节点
  return (
    found ||
    tree.reduce(
      (acc, node) =>
        acc || (node.children && getNodeByKeyValue(node.children, key, value)),
      null,
    )
  );
};

// 根据id以及键值对设置节点的值
export const setNodeValueById = (
  ids,
  key,
  value,
  layerTree,
  setUnMatch = false, //是否需要设置未匹配的节点的值
  unMatchValue = !value, //未匹配的节点的值
) => {
  const idSet = new Set(ids); // 使用 Set 提高查找性能

  const setValue = (nodes) => {
    nodes.forEach((node) => {
      if (idSet.has(node.id)) {
        node[key] = value; // 匹配的节点直接赋值
      } else if (setUnMatch) {
        node[key] = unMatchValue; // 未匹配的节点取反值
      }
      node.children && setValue(node.children);
    });
  };
  setValue(layerTree); // 直接修改原树
};

//获取定位参数
export const getLocationParams = (nodeData, mode) => {
  if (!nodeData?.children?.length) return {};

  // 筛选并转换有效坐标数组
  const locationArray = nodeData.children
    .filter(
      (child) => child.location && (mode === "both" || child.viewMode === mode), // 筛选出有效的位置数据
    )
    .map((child) => {
      const [x, y, z] = child.location.center_coord.split(",").map(Number); //字符串转数字数组
      return { ...child.location, x, y, z };
    });

  if (locationArray.length === 0) return {};

  // 计算平均值
  const sum = locationArray.reduce(
    (acc, curr) => ({
      x: acc.x + curr.x,
      y: acc.y + curr.y,
      z: acc.z + curr.z,
      yaw: acc.yaw + curr.yaw,
      arm_distance: acc.arm_distance + curr.arm_distance,
      pitch: acc.pitch + curr.pitch,
    }),
    { x: 0, y: 0, z: 0, yaw: 0, arm_distance: 0, pitch: 0 },
  );

  const count = locationArray.length;
  return {
    yaw: sum.yaw / count,
    arm_distance: sum.arm_distance / count,
    center_coord: `${sum.x / count}, ${sum.y / count}, ${sum.z / count}`,
    pitch: sum.pitch / count,
  };
};

/**
 * 获取勾选的图层标识keys集合
 * @param data 图层树数据
 * @returns 勾选的图层标识集合
 */
export const getCheckedKeys = (data: any[]) => {
  if (!data) return [];
  const checkedIds = new Set(); // 使用Set避免重复检查
  const collectKeys = (nodes: any[]) => {
    nodes.forEach((item) => {
      //被选中的节点的id添加到checkedIds中
      if (item.isChecked === true && item.nodeType === "merge-layer") {
        checkedIds.add(item.id);
      }
      if (item.children?.length && item.nodeType === "group") {
        collectKeys(item.children);
      }
    });
  };
  collectKeys(data);
  return Array.from(checkedIds);
};


/**
 * 获取勾选的图层节点集合
 * @param tree 图层树数据
 * @returns 图层的节点集合
 */
export const getCheckdedLayers = (tree: any[]) => {
  const checkedLayers = [];
  const traverse = (node: any) => {
    if (node.isChecked === true && node.nodeType === 'layer') {
      checkedLayers.push(node);
    }
    if (node.children && node.children.length > 0) {
      node.children.forEach((child) => {
        traverse(child);
      });
    }
  };
  tree.forEach((node) => {
    traverse(node);
  });
  return checkedLayers;
};

/**
 * 将扁平数组转换为树形结构
 * @param list 扁平数组
 * @param options 配置项
 * @returns 树形结构数组
 */
export function transToTree<T extends Record<string, any>>(
  list: T[],
  options: {
    pidKey: keyof T;       // 父节点ID的字段名
    pid?: any;             // 起始父节点值
    childrenKey: string;   // 子节点数组的字段名
    idKey: keyof T;        // 节点ID的字段名
  }
): T[] {
  const { pidKey, pid, childrenKey, idKey } = options;

  // 获取当前层级的节点
  const treeList = list.filter(item => {
    if (pid !== undefined) {
      return item[pidKey] === pid;
    } else {
      // 如果没有指定pid，则找出顶级节点（没有父节点或父节点不在列表中）
      return !item[pidKey] || !list.some(e => e[idKey] === item[pidKey]);
    }
  });

  // 递归构建子树
  treeList.forEach(item => {
    const children = transToTree(list, {
      ...options,
      pid: item[idKey]  // 将当前节点ID作为子节点的pid
    });

    if (children.length > 0) {
      (item as Record<string, any>)[childrenKey] = children;
    }
  });

  return treeList;
}
