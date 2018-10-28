# insert At

Insert an element into an array at some position.

```sig
[0].insertAt(0, 0)
```

The size of the array grows by one. The element is added to the array at the position you want. If there's
an element already at that position, then it and all the other elements after it are moved (shifted) to the
next higher position. So, an array that has the numbers `4, 5, 9, 3` will be `4, 5, 9, 2, 3` if `2` is inserted
at position 3. It looks like this in blocks:

```block
let myNumbers = [4, 5, 9, 3];
myNumbers.insertAt(3, 2);
```

## Parameters

* **index**: a [number](/types/number) which is the position in the array to insert the element at.

## Example

Make a ordered array that has the numbers from a jumbled an array in order of lowest to highest.

```blocks
let jumbled = [4, 5, 2, 1, 6, 9, 0, 3, 8, 7];
let ordered = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
for (let item of jumbled) {
    ordered.insertAt(item, item);
    ordered.removeAt(item + 1);
}
```

## See also

[remove at](/reference/arrays/remove-at)