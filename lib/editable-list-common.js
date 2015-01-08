if (typeof EditableList === 'undefined') {
  EditableList = {};
}

EditableList.userCanEdit = function(Collection) {
  return (typeof this.userCanEdit !== 'undefined') ? this.userCanEdit : true;	
}