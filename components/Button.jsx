import { StyleSheet, Text, TouchableOpacity } from 'react-native';

const Button = ({title='버튼', ...props}) => {
  return (
    <TouchableOpacity 
      style={styles.container}
      {...props}
    >
      <Text>{title}</Text>
    </TouchableOpacity>
  );
};

export default Button;

const styles = StyleSheet.create({
  container: {
    padding: 10,
    borderWidth : 1,
    alignItems : 'center'
  },
});
